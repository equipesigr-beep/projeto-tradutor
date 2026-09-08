(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const state = {
    running: false,
    paused: false,
    recognition: null,
    speechSupported: false,
    speechActive: false,
    speed: 1,
    lastTranslation: '',
    lastSource: '',
    lastSpokenText: '',
    availableDevices: [],
    lastResultFinal: '',
    lastInterim: ''
  };

  const ui = {
    startBtn: $('startBtn'),
    statusPill: $('statusPill'),
    micIndicator: $('micIndicator'),
    speakerIndicator: $('speakerIndicator'),
    inputDevice: $('inputDevice'),
    direction: $('direction'),
    messages: $('messages'),
    conversationHint: $('conversationHint'),
    clearBtn: $('clearBtn'),
    slowerBtn: $('slowerBtn'),
    fasterBtn: $('fasterBtn'),
    speedValue: $('speedValue'),
    speakToggle: $('speakToggle'),
    essentialToggle: $('essentialToggle'),
    onlineState: $('onlineState'),
    manualText: $('manualText'),
    manualTranslateBtn: $('manualTranslateBtn'),
    manualSpeakBtn: $('manualSpeakBtn'),
    providerNote: $('providerNote')
  };

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  state.speechSupported = Boolean(SpeechRecognition);

  function setStatus(label, mode = 'offline') {
    ui.statusPill.textContent = label;
    ui.statusPill.className = `status-pill ${mode}`;
  }

  function setMic(active) {
    ui.micIndicator.classList.toggle('active', active);
  }

  function setSpeaker(active) {
    ui.speakerIndicator.classList.toggle('active', active);
  }

  function addMessage({source, translation, lang, kind = 'normal'}) {
    const empty = ui.messages.querySelector('.empty-state');
    if (empty) empty.remove();

    const item = document.createElement('article');
    item.className = `message ${kind}`;

    const meta = document.createElement('div');
    meta.className = 'meta';

    const sourceLabel = document.createElement('span');
    sourceLabel.className = 'source';
    sourceLabel.textContent = source;

    const time = document.createElement('span');
    time.textContent = new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit' }).format(new Date());

    meta.append(sourceLabel, time);

    const sourceText = document.createElement('div');
    sourceText.className = 'translation';
    sourceText.textContent = translation;

    item.append(meta, sourceText);
    ui.messages.appendChild(item);
    ui.messages.scrollTop = ui.messages.scrollHeight;
  }

  function clearMessages() {
    ui.messages.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎧</div>
        <strong>Pronto para testar</strong>
        <span>Toque em “Iniciar conversa” e fale perto do microfone.</span>
      </div>`;
  }

  function normalize(text) {
    return text
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim();
  }

  function essentialize(text) {
    const clean = text.trim();
    if (!ui.essentialToggle.checked || clean.length < 120) return clean;

    const parts = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
    if (parts.length <= 1) return clean.slice(0, 180) + (clean.length > 180 ? '…' : '');
    return parts.slice(0, 2).join(' ');
  }

  // V1 local phrasebook. It deliberately does NOT pretend to be a full AI translator.
  // A future TranslationProvider can replace this function without touching the audio layer.
  const phrasebook = new Map([
    ['how are you', 'Como você está?'],
    ['what is your name', 'Qual é o seu nome?'],
    ['where are you from', 'De onde você é?'],
    ['nice to meet you', 'Prazer em conhecer você.'],
    ['what do you do', 'O que você faz?'],
    ['where do you live', 'Onde você mora?'],
    ['can you help me', 'Você pode me ajudar?'],
    ['i understand', 'Eu entendo.'],
    ['i dont understand', 'Eu não entendo.'],
    ['i do not understand', 'Eu não entendo.'],
    ['please speak slowly', 'Por favor, fale devagar.'],
    ['could you repeat that', 'Você poderia repetir isso?'],
    ['say that again', 'Diga isso novamente.'],
    ['thank you', 'Obrigado.'],
    ['thank you very much', 'Muito obrigado.'],
    ['you are welcome', 'De nada.'],
    ['see you later', 'Até mais tarde.'],
    ['i am from brazil', 'Eu sou do Brasil.'],
    ['i live in brazil', 'Eu moro no Brasil.'],
    ['i am learning english', 'Eu estou aprendendo inglês.'],
    ['i speak a little english', 'Eu falo um pouco de inglês.'],
    ['i need a moment', 'Eu preciso de um momento.'],
    ['what do you mean', 'O que você quer dizer?'],
    ['just a moment', 'Só um momento.'],
    ['no problem', 'Sem problema.'],
    ['that sounds good', 'Isso parece bom.'],
    ['i agree', 'Eu concordo.'],
    ['i dont know', 'Eu não sei.'],
    ['i do not know', 'Eu não sei.']
  ]);

  const reversePhrasebook = new Map([
    ['como voce esta', 'How are you?'],
    ['qual e o seu nome', 'What is your name?'],
    ['de onde voce e', 'Where are you from?'],
    ['prazer em conhecer voce', 'Nice to meet you.'],
    ['o que voce faz', 'What do you do?'],
    ['onde voce mora', 'Where do you live?'],
    ['voce pode me ajudar', 'Can you help me?'],
    ['eu entendo', 'I understand.'],
    ['eu nao entendo', 'I don’t understand.'],
    ['por favor, fale devagar', 'Please speak slowly.'],
    ['voce poderia repetir isso', 'Could you repeat that?'],
    ['diga isso novamente', 'Say that again.'],
    ['obrigado', 'Thank you.'],
    ['muito obrigado', 'Thank you very much.'],
    ['de nada', 'You’re welcome.'],
    ['ate mais tarde', 'See you later.'],
    ['eu sou do brasil', 'I’m from Brazil.'],
    ['eu moro no brasil', 'I live in Brazil.'],
    ['eu estou aprendendo ingles', 'I’m learning English.'],
    ['eu falo um pouco de ingles', 'I speak a little English.'],
    ['eu preciso de um momento', 'I need a moment.'],
    ['o que voce quer dizer', 'What do you mean?'],
    ['so um momento', 'Just a moment.'],
    ['sem problema', 'No problem.'],
    ['isso parece bom', 'That sounds good.'],
    ['eu concordo', 'I agree.'],
    ['eu nao sei', 'I don’t know.']
  ]);

  function translateLocal(text, direction) {
    const key = normalize(text);
    if (direction === 'en-pt') return phrasebook.get(key) || null;
    if (direction === 'pt-en') return reversePhrasebook.get(key) || null;
    return phrasebook.get(key) || reversePhrasebook.get(key) || null;
  }

  function heuristicInterpret(text, direction) {
    const local = translateLocal(text, direction);
    if (local) return { text: essentialize(local), exact: true };

    // Safe fallback: don't invent a "precise" translation.
    const lang = direction === 'pt-en' ? 'inglês' : 'português';
    return {
      text: `[V1] Frase recebida, mas a tradução completa para ${lang} ainda não está ligada a um motor de IA. A arquitetura já está preparada para plugar um provedor sem alterar o áudio.`,
      exact: false
    };
  }

  async function interpret(text) {
    const direction = ui.direction.value;
    return heuristicInterpret(text, direction);
  }

  function speak(text, lang = 'en-US') {
    if (!('speechSynthesis' in window) || !text) return;
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = state.speed;
    utter.pitch = 1;
    utter.onstart = () => setSpeaker(true);
    utter.onend = () => setSpeaker(false);
    utter.onerror = () => setSpeaker(false);

    state.lastSpokenText = text;
    window.speechSynthesis.speak(utter);
  }

  function getOutputLang() {
    const direction = ui.direction.value;
    return direction === 'pt-en' ? 'en-US' : 'pt-BR';
  }

  function handleCommand(text) {
    const t = normalize(text);

    if (/\b(repet|repete|repetir|diz de novo|fala de novo)\b/.test(t)) {
      if (state.lastSpokenText) speak(state.lastSpokenText, getOutputLang());
      addMessage({source: 'Comando', translation: 'Repetindo a última resposta.', kind: 'command'});
      return true;
    }

    if (/\bmais devagar|devagar|fala mais lento|fale mais lento\b/.test(t)) {
      state.speed = Math.max(.55, +(state.speed - .15).toFixed(2));
      updateSpeedUI();
      addMessage({source: 'Comando', translation: `Velocidade ajustada para ${state.speed.toFixed(2).replace('.', ',')}×.`, kind: 'command'});
      return true;
    }

    if (/\bmais rapido|mais rápido|fala mais rapido|fale mais rapido\b/.test(t)) {
      state.speed = Math.min(1.5, +(state.speed + .15).toFixed(2));
      updateSpeedUI();
      addMessage({source: 'Comando', translation: `Velocidade ajustada para ${state.speed.toFixed(2).replace('.', ',')}×.`, kind: 'command'});
      return true;
    }

    if (/\bso o essencial|só o essencial|resuma|resume|resumir\b/.test(t)) {
      ui.essentialToggle.checked = true;
      addMessage({source: 'Comando', translation: 'Modo “só o essencial” ativado.', kind: 'command'});
      return true;
    }

    if (/\bvolta ao normal|modo normal|sem resumo\b/.test(t)) {
      ui.essentialToggle.checked = false;
      addMessage({source: 'Comando', translation: 'Modo normal ativado.', kind: 'command'});
      return true;
    }

    if (/^(pausa|pause|parar|para)$/.test(t)) {
      pauseRecognition();
      addMessage({source: 'Comando', translation: 'Reconhecimento pausado.', kind: 'command'});
      return true;
    }

    if (/^(retoma|retomar|continua|continuar)$/.test(t)) {
      resumeRecognition();
      addMessage({source: 'Comando', translation: 'Reconhecimento retomado.', kind: 'command'});
      return true;
    }

    return false;
  }

  async function handleFinalTranscript(text) {
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (!cleaned) return;

    if (handleCommand(cleaned)) return;

    state.lastSource = cleaned;
    ui.conversationHint.textContent = 'Interpretando…';

    const result = await interpret(cleaned);

    state.lastTranslation = result.text;
    addMessage({
      source: 'Fala detectada',
      translation: result.text,
      lang: getOutputLang(),
      kind: result.exact ? 'interpreted' : 'normal'
    });

    if (ui.speakToggle.checked && result.exact) {
      speak(result.text, getOutputLang());
    }

    ui.conversationHint.textContent = state.running ? 'Ouvindo continuamente…' : 'Aguardando início.';
  }

  function preferredRecognitionLocale() {
    const direction = ui.direction.value;
    if (direction === 'pt-en') return 'pt-BR';
    if (direction === 'en-pt') return 'en-US';
    return 'en-US';
  }

  function setupRecognition() {
    if (!SpeechRecognition) {
      ui.conversationHint.textContent = 'Este navegador não disponibiliza reconhecimento de voz compatível.';
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.lang = preferredRecognitionLocale();

    recognition.onstart = () => {
      state.speechActive = true;
      setMic(true);
      setStatus('Ouvindo', 'live');
      ui.conversationHint.textContent = 'Ouvindo continuamente…';
    };

    recognition.onresult = async (event) => {
      let finalText = '';
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0]?.transcript || '';
        if (result.isFinal) finalText += transcript;
        else interimText += transcript;
      }

      state.lastInterim = interimText;
      if (interimText) {
        ui.conversationHint.textContent = `Ouvindo: “${interimText.trim()}”`;
      }
      if (finalText.trim()) {
        state.lastResultFinal = finalText.trim();
        await handleFinalTranscript(finalText);
      }
    };

    recognition.onerror = (event) => {
      console.warn('SpeechRecognition error:', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setStatus('Microfone bloqueado', 'offline');
        ui.conversationHint.textContent = 'Permita o acesso ao microfone no navegador.';
        state.running = false;
        setMic(false);
      } else if (event.error === 'no-speech') {
        ui.conversationHint.textContent = 'Nenhuma fala detectada. Continuando a ouvir…';
      } else {
        ui.conversationHint.textContent = `Reconhecimento: ${event.error}`;
      }
    };

    recognition.onend = () => {
      state.speechActive = false;
      setMic(false);

      if (state.running && !state.paused) {
        // Restart keeps the experience continuous on browsers that end recognition.
        window.setTimeout(() => {
          if (!state.running || state.paused) return;
          try {
            recognition.lang = preferredRecognitionLocale();
            recognition.start();
          } catch {}
        }, 250);
      } else {
        setStatus('Parado', 'offline');
      }
    };

    return recognition;
  }

  function startRecognition() {
    if (!state.speechSupported) {
      addMessage({
        source: 'Sistema',
        translation: 'Este navegador não oferece SpeechRecognition. Tente Chrome/Edge em um ambiente compatível.',
        kind: 'command'
      });
      return;
    }

    if (!state.recognition) state.recognition = setupRecognition();

    if (!state.recognition) return;

    state.running = true;
    state.paused = false;

    navigator.mediaDevices?.getUserMedia?.({ audio: true })
      .then(() => refreshInputDevices())
      .catch(() => {});

    try {
      state.recognition.lang = preferredRecognitionLocale();
      state.recognition.start();
    } catch {}

    ui.startBtn.textContent = '■ Parar conversa';
  }

  function stopRecognition() {
    state.running = false;
    state.paused = false;
    if (state.recognition) {
      try { state.recognition.stop(); } catch {}
    }
    setMic(false);
    setStatus('Parado', 'offline');
    ui.conversationHint.textContent = 'Aguardando início.';
    ui.startBtn.textContent = '▶ Iniciar conversa';
  }

  function pauseRecognition() {
    if (!state.running) return;
    state.paused = true;
    if (state.recognition) {
      try { state.recognition.stop(); } catch {}
    }
    setMic(false);
    setStatus('Pausado', 'offline');
    ui.conversationHint.textContent = 'Pausado. Diga “retoma” ou toque em iniciar.';
  }

  function resumeRecognition() {
    if (!state.running) {
      startRecognition();
      return;
    }

    state.paused = false;
    if (state.recognition) {
      try {
        state.recognition.lang = preferredRecognitionLocale();
        state.recognition.start();
      } catch {}
    }
  }

  async function refreshInputDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) return;

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter(d => d.kind === 'audioinput');
      state.availableDevices = inputs;

      ui.inputDevice.innerHTML = '';
      if (!inputs.length) {
        const option = document.createElement('option');
        option.textContent = 'Microfone padrão do dispositivo';
        option.value = '';
        ui.inputDevice.appendChild(option);
        return;
      }

      inputs.forEach((device, index) => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.textContent = device.label || `Microfone ${index + 1}`;
        ui.inputDevice.appendChild(option);
      });
    } catch (error) {
      console.warn('enumerateDevices:', error);
    }
  }

  function updateSpeedUI() {
    ui.speedValue.textContent = `${state.speed.toFixed(2).replace('.', ',')}×`;
  }

  function updateOnlineState() {
    const online = navigator.onLine;
    ui.onlineState.textContent = online ? 'Online' : 'Offline';
    ui.providerNote.textContent = online
      ? 'V1 está sem backend de tradução: o reconhecimento de voz pode depender do navegador. O motor de IA será plugado numa etapa separada.'
      : 'Você está offline. A interface e o service worker continuam disponíveis; a tradução completa depende de um motor local que ainda será integrado.';
    if (!state.running) setStatus(online ? 'Pronto' : 'Offline', online ? 'online' : 'offline');
  }

  ui.startBtn.addEventListener('click', () => {
    if (state.running) stopRecognition();
    else startRecognition();
  });

  ui.direction.addEventListener('change', () => {
    if (state.recognition) {
      try { state.recognition.stop(); } catch {}
    }
    if (state.running) {
      window.setTimeout(() => {
        if (!state.running) return;
        try {
          state.recognition = setupRecognition();
          state.recognition.lang = preferredRecognitionLocale();
          state.recognition.start();
        } catch {}
      }, 300);
    }
  });

  ui.slowerBtn.addEventListener('click', () => {
    state.speed = Math.max(.55, +(state.speed - .15).toFixed(2));
    updateSpeedUI();
  });

  ui.fasterBtn.addEventListener('click', () => {
    state.speed = Math.min(1.5, +(state.speed + .15).toFixed(2));
    updateSpeedUI();
  });

  ui.clearBtn.addEventListener('click', clearMessages);

  ui.manualTranslateBtn.addEventListener('click', async () => {
    const text = ui.manualText.value.trim();
    if (!text) return;

    const result = await interpret(text);
    state.lastTranslation = result.text;
    addMessage({source: 'Teste manual', translation: result.text, kind: result.exact ? 'interpreted' : 'normal'});
    if (ui.speakToggle.checked && result.exact) speak(result.text, getOutputLang());
  });

  ui.manualSpeakBtn.addEventListener('click', () => {
    if (state.lastTranslation) speak(state.lastTranslation, getOutputLang());
  });

  window.addEventListener('online', updateOnlineState);
  window.addEventListener('offline', updateOnlineState);

  if (navigator.mediaDevices?.addEventListener) {
    navigator.mediaDevices.addEventListener('devicechange', refreshInputDevices);
  }

  // Register the PWA service worker.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').catch(console.warn);
    });
  }

  // First permission prompt happens only after user interaction.
  refreshInputDevices();
  updateSpeedUI();
  updateOnlineState();

  if (!state.speechSupported) {
    ui.providerNote.textContent = 'O navegador atual não oferece SpeechRecognition compatível. A interface continua funcionando para teste manual.';
  }
})();
