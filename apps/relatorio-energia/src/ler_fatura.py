"""
Lê a fatura da Neoenergia em qualquer dos formatos que chegam na prática
(2026-11-23, caso Gustavo Diniz):

1. PDF digital com senha — a Neoenergia passou a proteger a fatura com os
   5 primeiros dígitos do CPF/CNPJ do titular. A senha sai do cadastro do
   cliente no AGO (CPF_CNPJ em cliente_dados).
2. PDF de texto sem senha — o formato antigo, lido por regex (extract_conta).
3. PDF que é só imagem (fatura impressa/escaneada, ou "salva como PDF" a
   partir de um visualizador) — não tem texto; lido por visão (Claude), no
   mesmo padrão do extract_gdash, devolvendo os mesmos campos.

Antes disso, a fatura com senha ou em imagem estourava como
"'NoneType' object has no attribute 'group'" — sem dizer o que fazer.
"""
import base64
import json
import os
import re

import fitz  # pymupdf
from anthropic import Anthropic

from extract_conta import extrair_conta_neoenergia
from gerar_relatorio import FaturaProtegida, pdf_para_texto


class FaturaIlegivel(Exception):
    """Erro com mensagem pronta para o usuário."""


def senha_fatura(cpf_cnpj: str | None) -> str | None:
    digitos = re.sub(r"\D", "", cpf_cnpj or "")
    return digitos[:5] if len(digitos) >= 5 else None


PROMPT_VISAO = """A imagem é uma fatura de energia elétrica (DANFE) da Neoenergia. Extraia os \
campos abaixo e devolva APENAS um JSON válido, sem markdown. Copie números e datas EXATAMENTE \
como estão impressos (formato brasileiro, vírgula decimal, ponto de milhar), como texto:

{
  "cliente": "NOME DO CLIENTE",
  "codigo_instalacao": "número da unidade consumidora ou null",
  "ref_mes_ano": "11/2026",
  "total_a_pagar": "565,69",
  "vencimento": "18/12/2026",
  "leitura_anterior": "05/10/2026",
  "leitura_atual": "04/11/2026",
  "consumo_faturado_kwh": "446,00",
  "leitura_medidor_anterior": "36.625,00",
  "leitura_medidor_atual": "37.594,00",
  "energia_injetada_kwh": "523",
  "saldo_proximo_ciclo_kwh": "0",
  "energia_compensada_kwh": "523"
}

Onde achar:
- consumo_faturado_kwh: quantidade da linha "Consumo-TUSD" (kWh).
- leitura_medidor_*: linha "Energia Ativa" da tabela do MEDIDOR (leituras anterior e atual).
- energia_injetada_kwh e saldo_proximo_ciclo_kwh: nota em INFORMAÇÕES IMPORTANTES,
  "Energia injetada no mes N kWh. Saldo para o proximo ciclo N kWh".
- energia_compensada_kwh: nota "ajuste na(s) função(ões) CAT de - N kWh" (só o número).
- Campo ausente na imagem: null. Não invente valores."""


def _paginas_png(caminho_pdf: str, senha: str | None) -> list[str]:
    doc = fitz.open(caminho_pdf)
    if doc.needs_pass and not (senha and doc.authenticate(senha)):
        raise FaturaProtegida("senha não abriu o PDF")
    imagens = []
    for pagina in doc:
        pix = pagina.get_pixmap(dpi=150)
        imagens.append(base64.b64encode(pix.tobytes("png")).decode("utf-8"))
    return imagens


def _num_br(s) -> float | None:
    if s is None or str(s).strip() == "":
        return None
    return float(str(s).replace(".", "").replace(",", "."))


def extrair_conta_por_imagem(caminho_pdf: str, senha: str | None) -> dict:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY não configurada")
    imagens = _paginas_png(caminho_pdf, senha)
    content = [{"type": "text", "text": PROMPT_VISAO}]
    for img in imagens[:2]:  # a 2ª página da Neoenergia só repete endereço/canais
        content.append({"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": img}})
    resposta = Anthropic(api_key=api_key).messages.create(
        model="claude-sonnet-4-6", max_tokens=1000,
        messages=[{"role": "user", "content": content}],
    )
    texto = "".join(b.text for b in resposta.content if b.type == "text").strip()
    texto = texto.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    v = json.loads(texto)

    if not v.get("leitura_anterior") or not v.get("leitura_atual"):
        raise FaturaIlegivel("Não foi possível ler as datas de leitura na imagem da fatura.")

    # Mesmo formato que extrair_conta_neoenergia devolve
    ant, atu = _num_br(v.get("leitura_medidor_anterior")), _num_br(v.get("leitura_medidor_atual"))
    return {
        "cliente": v.get("cliente"),
        "codigo_instalacao": v.get("codigo_instalacao"),
        "ref_mes_ano": v.get("ref_mes_ano"),
        "total_a_pagar": v.get("total_a_pagar"),
        "vencimento": v.get("vencimento"),
        "ciclo_leitura": f"{v['leitura_anterior']} a {v['leitura_atual']}",
        "consumo_faturado_kwh": v.get("consumo_faturado_kwh"),
        "energia_injetada_kwh": v.get("energia_injetada_kwh"),
        "energia_compensada_kwh": v.get("energia_compensada_kwh"),
        "saldo_proximo_ciclo_kwh": v.get("saldo_proximo_ciclo_kwh"),
        **({"consumo_medido_kwh": round(atu - ant, 2)} if ant is not None and atu is not None and atu >= ant else {}),
    }


def ler_fatura(caminho_pdf: str, cpf_cnpj: str | None) -> dict:
    senha = senha_fatura(cpf_cnpj)
    try:
        texto = pdf_para_texto(caminho_pdf)
    except FaturaProtegida:
        if not senha:
            raise FaturaIlegivel(
                "A fatura está protegida por senha (5 primeiros dígitos do CPF/CNPJ do titular) "
                "e o cliente não tem CPF/CNPJ no cadastro do AGO. Preencha o cadastro e gere de novo.")
        try:
            texto = pdf_para_texto(caminho_pdf, senha)
        except FaturaProtegida:
            raise FaturaIlegivel(
                f"A senha da fatura não é {senha} (5 primeiros dígitos do CPF/CNPJ do cadastro). "
                "Confira se o CPF/CNPJ do cliente no AGO é o do titular da conta de energia.")

    # PDF com texto: regex, como sempre. Sem texto (imagem) ou layout que a
    # regex não entende: visão.
    if "NOME DO CLIENTE" in texto and "LEITURA ATUAL" in texto:
        try:
            return extrair_conta_neoenergia(texto)
        except (AttributeError, ValueError):
            pass
    try:
        return extrair_conta_por_imagem(caminho_pdf, senha)
    except FaturaProtegida:
        raise FaturaIlegivel("Não foi possível abrir a fatura com a senha do CPF/CNPJ do cadastro.")
