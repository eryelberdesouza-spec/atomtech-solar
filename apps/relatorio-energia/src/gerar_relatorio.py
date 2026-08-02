#!/usr/bin/env python3
"""
Orquestrador único do relatório mensal de Gestão Inteligente de Energia.

Entra:  conta de energia (PDF) + export do GDASH (PDF) + id do cliente cadastrado
Sai:    .pptx pronto para virar PDF e enviar ao cliente

Requer: ANTHROPIC_API_KEY no ambiente (extração do GDASH e textos analíticos usam IA).

Uso:
    python3 src/gerar_relatorio.py \
        --cliente margran \
        --conta caminho/conta.pdf \
        --gdash caminho/gdash.pdf \
        --saida relatorios_gerados/margran_mai2026.pptx
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from extract_conta import extrair_conta_neoenergia
from extract_gdash import extrair_gdash
from generate_narrative import gerar_narrativa
from fill_template import fill, TEMPLATE_PATH


def fmt_kwh(x):
    x = float(x)
    if x.is_integer():
        s = f"{int(x):,}".replace(",", ".")
    else:
        s = f"{x:,.1f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return s + " kWh"


def fmt_money(x):
    return "R$ " + f"{x:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def fmt_pct(x):
    return f"{x:,.1f}".replace(",", "X").replace(".", ",").replace("X", ".") + "%"


def pdf_para_texto(caminho_pdf: str) -> str:
    saida = subprocess.run(
        ["pdftotext", "-layout", caminho_pdf, "-"],
        capture_output=True, text=True, check=True,
    )
    return saida.stdout


def carregar_cliente(cliente_id: str) -> dict:
    with open(ROOT / "clientes.json", encoding="utf-8") as f:
        clientes = json.load(f)
    if cliente_id not in clientes:
        raise SystemExit(
            f"Cliente '{cliente_id}' não encontrado em clientes.json. "
            f"Cadastrados: {list(clientes)}"
        )
    return clientes[cliente_id]


def montar_dados(cliente: dict, conta: dict, gdash: dict) -> dict:
    """Junta conta + GDASH + contrato e calcula os campos derivados (sem IA)."""
    geracao = gdash["geracao_kwh"]
    injetado_gdash = gdash.get("energia_injetada_kwh") or float(
        str(conta["energia_injetada_kwh"]).replace(".", "").replace(",", ".")
    )
    autoconsumo = geracao - injetado_gdash

    hist = gdash["historico_meses"]
    mes_anterior, mes_atual, mes_seguinte = hist[0], hist[1], hist[2]

    dados = {
        # cadastro do cliente
        **cliente,
        # ciclo do relatório
        "MES_ANO": gdash["mes_ano"],
        "TIPO_CICLO": "Fechado",
        "REF_MES_ANO": conta["ref_mes_ano"],
        "CICLO_LEITURA": conta["ciclo_leitura"],
        "VENCIMENTO": conta["vencimento"],
        # KPIs do mês
        "GERACAO_KWH": fmt_kwh(geracao),
        "ECONOMIA_R$": fmt_money(gdash["economia_r$"]),
        "DESEMPENHO_PCT": fmt_pct(gdash["desempenho_pct"]),
        "AUTOCONSUMO_KWH": fmt_kwh(autoconsumo),
        # histórico 3 meses
        "MES_ANTERIOR": mes_anterior["mes"],
        "GERACAO_MES_ANTERIOR_KWH": fmt_kwh(mes_anterior["geracao_kwh"]),
        "DESEMPENHO_MES_ANTERIOR_PCT": fmt_pct(mes_anterior["desempenho_pct"]),
        "ECONOMIA_MES_ANTERIOR_R$": fmt_money(mes_anterior["economia_r$"]),
        "MES_ATUAL": mes_atual["mes"],
        "MES_SEGUINTE": mes_seguinte["mes"],
        "GERACAO_MES_SEGUINTE_KWH": fmt_kwh(mes_seguinte["geracao_kwh"]),
        "DESEMPENHO_MES_SEGUINTE_PCT": fmt_pct(mes_seguinte["desempenho_pct"]),
        "ECONOMIA_MES_SEGUINTE_R$": fmt_money(mes_seguinte["economia_r$"]),
        # fatura
        "CONSUMO_MEDIDO_KWH": fmt_kwh(conta["consumo_medido_kwh"]),
        "ENERGIA_INJETADA_KWH": fmt_kwh(injetado_gdash),
        "CONSUMO_FATURADO_KWH": conta["consumo_faturado_kwh"] + " kWh",
        "SALDO_PROXIMO_CICLO_KWH": conta["saldo_proximo_ciclo_kwh"] + " kWh",
        "TOTAL_A_PAGAR_R$": "R$ " + conta["total_a_pagar"],
        # emissão
        "LOCAL_EMISSAO": cliente["LOCAL_EMISSAO"],
    }
    return dados


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--cliente", required=True, help="id do cliente em clientes.json (ex.: margran)")
    ap.add_argument("--conta", required=True, help="PDF da conta de energia")
    ap.add_argument("--gdash", required=True, help="PDF exportado do GDASH")
    ap.add_argument("--data-emissao", default=None, help="dd/mm/aaaa (default: hoje)")
    ap.add_argument("--saida", required=True, help="caminho do .pptx final")
    args = ap.parse_args()

    from datetime import date
    data_emissao = args.data_emissao or date.today().strftime("%d/%m/%Y")

    print("[1/5] Carregando cadastro do cliente...")
    cliente = carregar_cliente(args.cliente)

    print("[2/5] Extraindo dados da conta de energia...")
    texto_conta = pdf_para_texto(args.conta)
    conta = extrair_conta_neoenergia(texto_conta)

    print("[3/5] Extraindo dados do GDASH (visão computacional)...")
    gdash = extrair_gdash(args.gdash)

    print("[4/5] Montando dados e gerando textos analíticos (IA)...")
    dados = montar_dados(cliente, conta, gdash)
    dados["DATA_EMISSAO"] = data_emissao

    contexto_narrativa = {
        "cliente": cliente["CLIENTE_NOME"],
        "mes_ano": dados["MES_ANO"],
        "geracao_kwh": gdash["geracao_kwh"],
        "desempenho_pct": gdash["desempenho_pct"],
        "economia_r$": gdash["economia_r$"],
        "consumo_medido_kwh": conta["consumo_medido_kwh"],
        "consumo_faturado_kwh": conta["consumo_faturado_kwh"],
        "energia_injetada_kwh": conta["energia_injetada_kwh"],
        "saldo_proximo_ciclo_kwh": conta["saldo_proximo_ciclo_kwh"],
        "total_a_pagar": conta["total_a_pagar"],
        "vencimento": conta["vencimento"],
        "ciclo_leitura": conta["ciclo_leitura"],
        "historico_meses": gdash["historico_meses"],
        "distribuidora": cliente["DISTRIBUIDORA"],
    }
    narrativa = gerar_narrativa(contexto_narrativa)
    dados.update(narrativa)

    print("[5/5] Preenchendo o template e salvando...")
    Path(args.saida).parent.mkdir(parents=True, exist_ok=True)
    fill(TEMPLATE_PATH, dados, args.saida)
    print(f"Relatório gerado: {args.saida}")


if __name__ == "__main__":
    main()
