import re, sys

def extrair_conta_neoenergia(texto: str) -> dict:
    """Extrai campos de uma fatura Neoenergia (DANFE) a partir do texto (pdftotext -layout)."""
    d = {}

    cliente_raw = re.search(r'NOME DO CLIENTE:\s*\n\s*(.+)', texto).group(1).strip()
    d['cliente'] = re.split(r'\s{2,}', cliente_raw)[0].strip()
    idx = texto.find('CÓDIGO DA INSTALAÇÃO')
    m = re.search(r'(\d{5,7})', texto[idx:idx+300]) if idx != -1 else None
    d['codigo_instalacao'] = m.group(1) if m else None
    # REF:MÊS/ANO e TOTAL A PAGAR costumam estar juntos logo após o cabeçalho, mas a
    # posição de VENCIMENTO varia entre layouts (às vezes longe, às vezes tudo numa
    # linha de recibo tipo "06/2026 ... VENCIMENTO 03/08/2026 ... TOTAL A PAGAR R$ 7.930,39").
    # Por isso são 3 buscas independentes, não uma só presa a posições fixas.
    header_idx = texto.find('REF:MÊS/ANO')
    bloco = texto[header_idx:header_idx+400]
    ref_total_m = re.search(r'(\d{2}/\d{4})\s+([\d.,]+)', bloco)
    d['ref_mes_ano'] = ref_total_m.group(1) if ref_total_m else None
    d['total_a_pagar'] = ref_total_m.group(2) if ref_total_m else None

    venc_m = re.search(r'VENCIMENTO[\s\S]{0,150}?(\d{2}/\d{2}/\d{4})', texto)
    d['vencimento'] = venc_m.group(1) if venc_m else None

    leitura_ant = re.search(r'LEITURA ANTERIOR\s+(\d{2}/\d{2}/\d{4})', texto)
    leitura_atu = re.search(r'LEITURA ATUAL\s+(\d{2}/\d{2}/\d{4})', texto)
    d['ciclo_leitura'] = f"{leitura_ant.group(1)} a {leitura_atu.group(1)}"

    # Consumo faturado (kWh) -- soma das linhas Consumo-TUSD / Consumo-TE (mesma quantidade nas duas)
    consumo_m = re.search(r'Consumo-TUSD\s+kWh\s+([\d.,]+)', texto)
    d['consumo_faturado_kwh'] = consumo_m.group(1) if consumo_m else None

    # Energia injetada e saldo -- vêm da nota de rodapé, não de uma coluna fixa
    inj_m = re.search(r'Energia injetada no mes\s*([\d.,]+)\s*kWh', texto, re.IGNORECASE)
    d['energia_injetada_kwh'] = inj_m.group(1) if inj_m else None

    saldo_m = re.search(r'Saldo para o proximo ciclo\s*([\d.,]+)\s*kWh', texto, re.IGNORECASE)
    d['saldo_proximo_ciclo_kwh'] = saldo_m.group(1) if saldo_m else None

    # Consumo medido = leitura atual - leitura anterior do medidor (não é a mesma coisa que consumo faturado,
    # que já vem líquido do ajuste de compensação/CAT).
    # A ordem das colunas (leitura anterior, leitura atual, const. medidor, consumo) na tabela
    # "Energia Ativa" varia conforme o pdftotext -layout quebra a linha; em vez de depender de
    # posição fixa, identifica a const. medidor pelo formato (5 casas decimais, ex. "1,00000")
    # e assume que leitura atual/anterior são os dois maiores valores restantes (leituras
    # cumulativas do medidor são sempre muito maiores que o consumo do ciclo).
    def to_float(s):
        return float(s.replace('.', '').replace(',', '.'))

    medidor_idx = texto.find('Energia Ativa')
    if medidor_idx != -1:
        bloco_medidor = texto[medidor_idx:medidor_idx+300]
        numeros_str = re.findall(r'[\d.]+,\d+', bloco_medidor)
        leituras = [to_float(n) for n in numeros_str if not re.match(r'^\d+,\d{5}$', n)]
        if len(leituras) >= 2:
            maiores = sorted(leituras, reverse=True)
            d['consumo_medido_kwh'] = round(maiores[0] - maiores[1], 2)

    return d

if __name__ == '__main__':
    texto = open(sys.argv[1], encoding='utf-8').read()
    import json
    print(json.dumps(extrair_conta_neoenergia(texto), indent=2, ensure_ascii=False))
