"""
Serviço interno (FastAPI) que expõe o pipeline de geração do relatório mensal de
Gestão Inteligente de Energia para o AGO (apps/web via proxy em apps/api).

Não é exposto diretamente à internet/usuário final — só apps/api fala com este
serviço, autenticado via header X-Internal-Secret (INTERNAL_SHARED_SECRET).

Requer: ANTHROPIC_API_KEY e INTERNAL_SHARED_SECRET no ambiente.
"""
import json
import os
import sys
import tempfile
from datetime import date
from pathlib import Path

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import Response

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "src"))

from extract_conta import extrair_conta_neoenergia  # noqa: E402
from extract_gdash import extrair_gdash  # noqa: E402
from generate_narrative import gerar_narrativa  # noqa: E402
from fill_template import fill, TEMPLATE_PATH  # noqa: E402
from gerar_relatorio import montar_dados, pdf_para_texto  # noqa: E402

INTERNAL_SHARED_SECRET = os.environ.get("INTERNAL_SHARED_SECRET")

app = FastAPI(title="Relatório de Energia — serviço interno Atom Tech")


def checar_segredo(x_internal_secret: str | None) -> None:
    if not INTERNAL_SHARED_SECRET:
        raise HTTPException(500, "INTERNAL_SHARED_SECRET não configurado no serviço")
    if x_internal_secret != INTERNAL_SHARED_SECRET:
        raise HTTPException(401, "Não autorizado")


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/gerar")
async def gerar(
    cliente_dados: str = Form(...),
    fatura: UploadFile = File(...),
    gdash: UploadFile = File(...),
    x_internal_secret: str | None = Header(default=None),
):
    checar_segredo(x_internal_secret)

    try:
        cliente_dados = json.loads(cliente_dados)
    except json.JSONDecodeError as e:
        raise HTTPException(400, f"cliente_dados inválido: {e}")

    campos_obrigatorios = [
        "CLIENTE_NOME", "CLIENTE_NOME_L1", "POTENCIA_KWP",
        "DISTRIBUIDORA", "RESPONSAVEL_TECNICO", "LOCAL_EMISSAO",
    ]
    faltando = [c for c in campos_obrigatorios if not cliente_dados.get(c)]
    if faltando:
        raise HTTPException(400, f"cliente_dados sem os campos: {', '.join(faltando)}")

    with tempfile.TemporaryDirectory() as tmp:
        caminho_fatura = Path(tmp) / "fatura.pdf"
        caminho_gdash = Path(tmp) / "gdash.pdf"
        caminho_fatura.write_bytes(await fatura.read())
        caminho_gdash.write_bytes(await gdash.read())

        try:
            texto_conta = pdf_para_texto(str(caminho_fatura))
            conta = extrair_conta_neoenergia(texto_conta)

            gdash_dados = extrair_gdash(str(caminho_gdash))

            dados = montar_dados(cliente_dados, conta, gdash_dados)
            dados["DATA_EMISSAO"] = date.today().strftime("%d/%m/%Y")

            contexto_narrativa = {
                "cliente": cliente_dados["CLIENTE_NOME"],
                "mes_ano": dados["MES_ANO"],
                "geracao_kwh": gdash_dados["geracao_kwh"],
                "desempenho_pct": gdash_dados["desempenho_pct"],
                "economia_r$": gdash_dados["economia_r$"],
                "consumo_medido_kwh": conta["consumo_medido_kwh"],
                "consumo_faturado_kwh": conta["consumo_faturado_kwh"],
                "energia_injetada_kwh": conta["energia_injetada_kwh"],
                "saldo_proximo_ciclo_kwh": conta["saldo_proximo_ciclo_kwh"],
                "total_a_pagar": conta["total_a_pagar"],
                "vencimento": conta["vencimento"],
                "ciclo_leitura": conta["ciclo_leitura"],
                "historico_meses": gdash_dados["historico_meses"],
                "distribuidora": cliente_dados["DISTRIBUIDORA"],
            }
            narrativa = gerar_narrativa(contexto_narrativa)
            dados.update(narrativa)

            caminho_saida = Path(tmp) / "relatorio.pptx"
            fill(TEMPLATE_PATH, dados, str(caminho_saida))
            conteudo = caminho_saida.read_bytes()
        except Exception as e:
            raise HTTPException(500, f"Falha ao gerar relatório: {e}")

    nome_cliente = cliente_dados["CLIENTE_NOME"].replace(" ", "_")
    nome_arquivo = f"{nome_cliente}_{dados['MES_ANO'].replace('/', '-')}.pptx"
    return Response(
        content=conteudo,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers={
            "Content-Disposition": f'attachment; filename="{nome_arquivo}"',
            "X-Relatorio-Mes-Ano": dados["MES_ANO"],
        },
    )
