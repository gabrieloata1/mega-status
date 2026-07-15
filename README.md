# Mega Status

App de perguntas diarias **Sim/Nao** com login, Supabase e reset automatico a meia-noite.

## Funcionalidades
- Login/Registro apenas com **usuario e senha** (sem e-mail)
- 2 **perguntas aleatorias por dia** (reset as 00:00)
- Botoes **Sim / Nao** para responder
- Mensagem de pagamento ao concluir
- **Mobile-first** responsivo
- Seguranca com **RLS no Supabase**

## Tecnologias
- HTML + CSS + JavaScript (vanilla)
- [Supabase](https://supabase.com) (Auth + Database)
- Cloudflare Tunnel (para acesso externo temporario)

## Estrutura do Banco
- `questions` - perguntas cadastradas pelo admin
- `answers` - respostas de cada usuario por dia
- `daily_questions` - 2 perguntas sorteadas por usuario/dia

## Como rodar
```bash
bash start.sh
```