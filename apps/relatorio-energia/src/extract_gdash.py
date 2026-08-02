"""
Extrai os dados do relatório GDASH (PDF sem texto — é imagem renderizada) via
visão computacional, usando a API da Anthropic.

Requer: variável de ambiente ANTHROPIC_API_KEY (nunca colocar a chave no código).

Uso:
    python3 src/extract_gdash.py caminho/relatorio_gdash.pdf
"""
import sys
import os
import json
import base64
import fitz  # pymupdf
from anthropic import Anthropic

SCHEMA_PROMPT = """Você é um extrator de dados. A imagem é um relatório mensal exportado da \
plataforma GDASH (monitoramento de energia solar). Extraia os seguintes campos e devolva \
APENAS um JSON válido, sem texto antes ou depois, sem markdown, seguindo exatamente este \
formato (use ponto como separador decimal nos números, sem milhar):

{
  "mes_ano": "Maio/2026",
  "geracao_kwh": 3408.9,
  "desempenho_pct": 83.0,
  "economia_r$": 3700.04,
  "consumo_kwh": 7187,
  "faturado_r$": 7949.70,
  "energia_injetada_kwh": 1113,
  "consumo_total_kwh": 9482.9,
  "historico_meses": [
    {"mes": "Abr/2026", "geracao_kwh": 1427.4, "desempenho_pct": 37.0, "economia_r$": 1555.89},
    {"mes": "Mai/2026", "geracao_kwh": 3408.9, "desempenho_pct": 83.0, "economia_r$": 3700.04},
    {"mes": "Jun/2026", "geracao_kwh": 0, "desempenho_pct": 0, "economia_r$": 0}
  ]
}

Regras importantes:
- "historico_meses" deve conter o mês anterior, o mês do relatório e o mês seguinte
  (se o mês seguinte ainda não tiver dado no gráfico, use 0 para geração/desempenho/economia).
- Se algum campo não existir na imagem, use null.
- Não invente números. Leia exatamente o que está na imagem (cards, tabela "Meses anteriores").
"""


def pdf_paginas_para_base64_png(caminho_pdf: str) -> list[str]:
    doc = fitz.open(caminho_pdf)
    imagens = []
    for pagina in doc:
        pix = pagina.get_pixmap(dpi=150)
        imagens.append(base64.b64encode(pix.tobytes("png")).decode("utf-8"))
    return imagens


def extrair_gdash(caminho_pdf: str) -> dict:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError(
            "ANTHROPIC_API_KEY não configurada. Defina a variável de ambiente antes de rodar."
        )

    client = Anthropic(api_key=api_key)
    imagens_b64 = pdf_paginas_para_base64_png(caminho_pdf)

    content = [{"type": "text", "text": SCHEMA_PROMPT}]
    for img_b64 in imagens_b64:
        content.append({
            "type": "image",
            "source": {"type": "base64", "media_type": "image/png", "data": img_b64},
        })

    resposta = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1500,
        messages=[{"role": "user", "content": content}],
    )

    texto = "".join(b.text for b in resposta.content if b.type == "text").strip()
    texto = texto.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    return json.loads(texto)


if __name__ == "__main__":
    dados = extrair_gdash(sys.argv[1])
    print(json.dumps(dados, indent=2, ensure_ascii=False))
