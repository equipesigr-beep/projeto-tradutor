# Projeto Tradutor — V1

## O que esta V1 já entrega

- PWA instalável.
- Interface preparada para telemóvel.
- Captação de microfone pelo navegador.
- Lista de dispositivos de áudio de entrada, quando o navegador disponibiliza os nomes.
- Compatibilidade com microfone do telemóvel e fone Bluetooth através do sistema de áudio do dispositivo.
- Reconhecimento de voz com `SpeechRecognition` / `webkitSpeechRecognition`, quando suportado pelo navegador.
- Direção Inglês → Português, Português → Inglês ou automática experimental.
- Síntese de voz com controle de velocidade.
- Comandos de voz: repetir, mais devagar, mais rápido, só o essencial, pausa e retoma.
- Histórico visual da conversa.
- Service Worker para manter a interface disponível offline.
- Arquitetura de tradução separada da camada de áudio.

## Limitação importante desta V1

A V1 **não inclui ainda um motor completo de tradução/interpretação por IA**. O código usa um pequeno phrasebook local para testar o fluxo e, quando a frase não está nele, informa que o provedor de IA ainda não foi ligado.

Também não assumimos que o reconhecimento de voz do navegador funcione sem internet em todos os aparelhos. A interface é offline, mas reconhecimento/tradução dependem das capacidades do navegador e do motor escolhido.

## Como testar no computador

Um PWA precisa de `http://localhost` ou `https://` para recursos como Service Worker e microfone.

Com Python:

```bash
python -m http.server 8000
```

Depois abra:

```text
http://localhost:8000
```

No telemóvel, para testar pelo mesmo Wi-Fi, o computador pode servir a pasta pelo IP local, por exemplo:

```text
http://192.168.0.10:8000
```

Alguns browsers exigem HTTPS para acesso ao microfone fora de `localhost`. Nesse caso, use uma hospedagem HTTPS temporária ou um túnel seguro durante os testes.

## Próxima etapa da arquitetura

A função `interpret()` é propositalmente isolada. Ela será substituída por um `TranslationProvider` / `InterpreterProvider` que poderá apontar para:

1. modelo local no dispositivo;
2. serviço online;
3. um híbrido que alterna automaticamente.

Assim a aplicação não fica presa a um único fornecedor.
