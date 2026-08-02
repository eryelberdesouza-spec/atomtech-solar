"""
Gera os textos analíticos e o julgamento de alertas do relatório (leitura técnica,
análise de desempenho, parecer final, alertas e recomendações) a partir dos dados
já extraídos da conta e do GDASH.

Requer: variável de ambiente ANTHROPIC_API_KEY.
"""
import os
import json
from anthropic import Anthropic

SYSTEM_PROMPT = """Você escreve relatórios técnicos de gestão de energia solar para a Atom Tech.

Tom obrigatório: técnico, corporativo, consultivo, objetivo, profissional.
Nunca use: emojis, marketing, frases sensacionalistas, tom amador, linguagem informal,
promessas absolutas de resultado financeiro ou de performance.

Regras de engenharia a respeitar:
- Nunca garanta economia financeira ou performance específica — o serviço é consultivo,
  obrigação de meio, não de resultado.
- Não afirme causa de falha técnica sem evidência nos dados fornecidos; se os dados não
  permitem concluir, diga isso explicitamente ("não há, pelos dados analisados, indício
  objetivo de falha técnica").
- Baseie-se exclusivamente nos números fornecidos. Não invente causas, não presuma
  histórico que não foi informado.

Você recebe um JSON com os dados extraídos da conta de energia, do GDASH e do contrato,
e devolve APENAS um JSON válido (sem markdown, sem texto fora do JSON) com estas chaves,
todas em português, prontas para inserção direta no relatório:

{
  "STATUS_MES": "NORMAL | ATENÇÃO | CRÍTICO",
  "RESUMO_EXECUTIVO": "... (máx. 250 caracteres, 2 frases)",
  "CONCLUSAO_EXECUTIVA": "Conclusão: ... (máx. 100 caracteres, 1 frase)",
  "LEITURA_TECNICA": "... (máx. 200 caracteres, 1-2 frases)",
  "ANALISE_DESEMPENHO": "... (máx. 230 caracteres, 2 frases)",
  "CONCLUSAO_PERFORMANCE": "... (máx. 100 caracteres, 1 frase)",
  "MENSAGEM_CLIENTE": "... (máx. 220 caracteres, 2 frases)",
  "LEITURA_FINAL_FATURA": "... (máx. 90 caracteres, 1 frase curta)",
  "ALERTA1_DESCRICAO": "... (máx. 35 caracteres)", "ALERTA1_CLASSIFICACAO": "...", "ALERTA1_ACAO": "... (máx. 40 caracteres)",
  "ALERTA2_DESCRICAO": "... (máx. 35 caracteres)", "ALERTA2_CLASSIFICACAO": "...", "ALERTA2_ACAO": "... (máx. 40 caracteres)",
  "ALERTA3_DESCRICAO": "... (máx. 35 caracteres)", "ALERTA3_CLASSIFICACAO": "...", "ALERTA3_ACAO": "... (máx. 40 caracteres)",
  "RECOM1_PRIORIDADE": "Baixa | Média | Alta", "RECOM1_TEXTO": "... (máx. 80 caracteres)", "RECOM1_RESPONSAVEL": "Cliente / Atom",
  "RECOM2_PRIORIDADE": "Baixa | Média | Alta", "RECOM2_TEXTO": "... (máx. 80 caracteres)", "RECOM2_RESPONSAVEL": "Cliente / Atom",
  "OBSERVACAO_FINAL_ALERTAS": "... (máx. 180 caracteres, 1-2 frases)",
  "PARECER_TECNICO_COMPLETO": "... (máx. 750 caracteres — UM parágrafo corrido, sem títulos numerados nem seções)"
}

Limites de tamanho (regra crítica, não é sugestão): os campos acima preenchem caixas de
texto de tamanho FIXO num template de PowerPoint sem redimensionamento automático — texto
acima do limite literalmente vaza para fora da caixa no arquivo final. Respeite os limites
de caracteres indicados em cada campo à risca, mesmo que isso signifique cortar detalhes.
Prefira frases mais curtas e diretas a frases completas mais longas. Nunca formate
PARECER_TECNICO_COMPLETO com títulos, numeração de seções ou quebras de parágrafo — é um
único parágrafo corrido, denso, sem estrutura de documento.

Critérios objetivos para status e alertas (aplique com julgamento, não mecanicamente):
- Desempenho < 50% no mês -> STATUS_MES = "ATENÇÃO" ou "CRÍTICO" conforme severidade;
  gerar alerta de performance.
- Saldo de créditos zerado por 2+ meses seguidos, com consumo faturado consistentemente
  alto -> alerta de "consumo elevado / dimensionamento".
- Cobrança de juros/multa/IGPM na fatura -> alerta administrativo (não é falha técnica).
- Se não há nenhum ponto fora do padrão, os 3 alertas podem ser de baixa relevância
  (ex.: acompanhamento de rotina) — não force um alerta grave que os dados não sustentam.

Se algum dos 3 alertas não tiver um ponto real para reportar, preencha com um item de
acompanhamento de rotina condizente com os dados (ex.: "Ciclo dentro do padrão esperado"),
nunca deixe o campo vazio ou genérico demais.
"""


def gerar_narrativa(dados: dict) -> dict:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError(
            "ANTHROPIC_API_KEY não configurada. Defina a variável de ambiente antes de rodar."
        )

    client = Anthropic(api_key=api_key)
    resposta = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4000,
        system=SYSTEM_PROMPT,
        messages=[{
            "role": "user",
            "content": "Dados do mês para o relatório:\n" + json.dumps(dados, ensure_ascii=False, indent=2),
        }],
    )

    texto = "".join(b.text for b in resposta.content if b.type == "text").strip()
    texto = texto.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    return json.loads(texto)


if __name__ == "__main__":
    import sys
    with open(sys.argv[1], encoding="utf-8") as f:
        dados = json.load(f)
    print(json.dumps(gerar_narrativa(dados), indent=2, ensure_ascii=False))
