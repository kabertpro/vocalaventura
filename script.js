/**
 * VOCALAVENTURA - Core Engine de Gestión Pedagógica Orofacial
 * Desarrollado con Vanilla JS enfocado a Mobile-First, Aleatoriedad e Interacción Sonora
 * Autor Requerido: KABERT STUDIO - LMKE
 */

// 1. BANCO DE DATOS DE EJERCICIOS (Mapeo Estricto de Recursos Disponibles)
const EXERCISE_DATABASE = {
    boca: [
        { id: 'b_a', name: '¡Dice la letra A!', file: 'bocaa.jpg' },
        { id: 'b_e', name: '¡Sonreímos con la E!', file: 'bocae.jpg' },
        { id: 'b_furioso', name: 'Cara de enojado', file: 'bocafurioso.jpg' },
        { id: 'b_i', name: 'Mostramos dientes con la I', file: 'bocai.jpg' },
        { id: 'b_llanto', name: 'Hacemos como el llanto', file: 'bocallanto.jpg' },
        { id: 'b_o', name: 'Boquita de sorpresa O', file: 'bocao.jpg' },
        { id: 'b_sonrisa', name: '¡Una gran sonrisa feliz!', file: 'bocasonrisa.jpg' },
        { id: 'b_sonrisacerrada', name: 'Boca cerrada y feliz', file: 'bocasonrisacerrada.jpg' },
        { id: 'b_u', name: 'Boquita de patito U', file: 'bocau.jpg' }
    ],
    lengua: [
        { id: 'l_afuera', name: 'Lengua afuera', file: 'lenguaafuera.jpg' },
        { id: 'l_arriba', name: 'Lengua arriba tocando la nariz', file: 'lenguaarriba.jpg' },
        { id: 'l_curvada', name: 'Hacemos un tubito con la lengua', file: 'lenguacurvada.jpg' },
        { id: 'l_dentro', name: 'Lengua guardada adentro', file: 'lenguadentro.jpg' },
        { id: 'l_inf_der', name: 'Lengua abajo a la derecha', file: 'lenguainferiorderecha.jpg' },
        { id: 'l_inf_izq', name: 'Lengua abajo a la izquierda', file: 'lenguainferiorizquierda.jpg' },
        { id: 'l_relajada', name: 'Lengua descansando relajada', file: 'lenguarelajada.jpg' },
        { id: 'l_sup_izq', name: 'Lengua arriba a la izquierda', file: 'lenguasupeiorizquierda.jpg' },
        { id: 'l_sup_der', name: 'Lengua arriba a la derecha', file: 'lenguasuperiorderecha.jpg' },
        { id: 'l_10', name: 'Movemos la lenguita libre', file: 'lengua_10.jpg' },
        { id: 'm_der', name: 'Inflamos la mejilla derecha', file: 'mejilladerecha.jpg' },
        { id: 'm_izq', name: 'Inflamos la mejilla izquierda', file: 'mejillaizquierda.jpg' }
    ]
};

const FEEDBACK_PHRASES = [
    "¡Lo estás haciendo increíble!",
    "¡Mírate en el espejo si puedes!",
    "¡Muy buen movimiento!",
    "¡Tu boquita trabaja fantástico!",
    "¡Qué gran esfuerzo haces!",
    "¡Sigamos jugando juntos!",
    "¡Qué divertido es practicar!"
];

// 2. ESTADO DEL JUEGO Y PRECARGA DE INSTANCIAS DE AUDIO FIJAS
let currentSessionExercises = [];
let currentIndex = 0;
let isPaused = false;
let timerDuration = 7; 
let timerInterval = null;
let currentProgressTime = 0;

// Asignación estricta e independiente de cada loop en memoria
const audioLoops = {
    lengua: new Audio('loop1.mp3'),
    boca: new Audio('loop2.mp3'),
    aleatorio: new Audio('loop3.mp3'),
    completa: new Audio('loop4.mp3')
};

// Configuración inicial de propiedades de bucle y volumen moderado
Object.values(audioLoops).forEach(track => {
    track.loop = true;
    track.volume = 0.35;
});

// Puntero de control para el loop activo actual
let currentTrack = null; 

// 3. SELECCIÓN DE ELEMENTOS DOM
const screens = {
    splash: document.getElementById('screen-splash'),
    menu: document.getElementById('screen-menu'),
    exercise: document.getElementById('screen-exercise'),
    congrats: document.getElementById('screen-congrats')
};

const elements = {
    btnStart: document.getElementById('btn-start'),
    btnHome: document.getElementById('btn-home'),
    btnPrev: document.getElementById('btn-prev'),
    btnNext: document.getElementById('btn-next'),
    btnPlayPause: document.getElementById('btn-play-pause'),
    btnRepeat: document.getElementById('btn-repeat'),
    btnFinish: document.getElementById('btn-finish'),
    exerciseTitle: document.getElementById('exercise-title'),
    exerciseImg: document.getElementById('exercise-img'),
    progressText: document.getElementById('progress-text'),
    progressBarFill: document.getElementById('progress-bar-fill'),
    timerBar: document.querySelector('.timer-bar'),
    feedbackBubble: document.getElementById('feedback-bubble'),
    menuButtons: document.querySelectorAll('.btn-menu'),
    confettiCanvas: document.getElementById('confetti-canvas')
};

// 4. MOTOR DE AUDIO HÍBRIDO (Efectos sintetizados + Control Multi-Mapeado de Loops)
const audioEngine = {
    ctx: null,
    
    initCtx() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    },

    // Generador de ondas sonoras nativo para efectos cortos (evita latencia de archivos FX externos)
    playTone(freq, type, duration, startVol = 0.15) {
        try {
            this.initCtx();
            let osc = this.ctx.createOscillator();
            let gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(startVol, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch(e) { console.log('Audio Context bloqueado temporalmente por el navegador.'); }
    },

    playPop() {
        this.playTone(400, 'sine', 0.08, 0.3);
        setTimeout(() => this.playTone(600, 'sine', 0.08, 0.2), 40);
    },

    playTick() {
        this.playTone(880, 'triangle', 0.05, 0.1);
    },

    playFanfare() {
        this.playTone(523.25, 'sine', 0.3, 0.2); 
        setTimeout(() => this.playTone(659.25, 'sine', 0.3, 0.2), 100); 
        setTimeout(() => this.playTone(783.99, 'sine', 0.4, 0.2), 200); 
        setTimeout(() => this.playTone(1046.50, 'sine', 0.6, 0.3), 300); 
    },

    // SISTEMA ANTI-SOLAPAMIENTO DE AUDIO
    startMusic(mode) {
        // Pausar y rebobinar absolutamente TODOS los loops de manera preventiva
        Object.values(audioLoops).forEach(track => {
            track.pause();
            track.currentTime = 0;
        });
        
        // Asignar el canal según la configuración solicitada
        currentTrack = audioLoops[mode];
        
        // Ejecutar reproducción controlando restricciones del navegador móvil
        currentTrack.play().catch(err => {
            console.log("Reproducción en espera del primer toque en pantalla.");
        });
    },

    stopMusic() {
        if (currentTrack) {
            currentTrack.pause();
            currentTrack.currentTime = 0;
            currentTrack = null;
        }
    },

    pauseMusic() {
        if (currentTrack && !currentTrack.paused) {
            currentTrack.pause();
        }
    },

    resumeMusic() {
        if (currentTrack && currentTrack.paused && !isPaused) {
            currentTrack.play().catch(() => {});
        }
    }
};

// 5. FUNCIÓN DE MEZCLA ALEATORIA (Algoritmo de Fisher-Yates Puro)
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// 6. CONTROLADORES DE FLUJO Y PANTALLAS
function showScreen(screenKey) {
    clearInterval(timerInterval);
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenKey].classList.add('active');
    
    if (screenKey === 'congrats') {
        audioEngine.stopMusic();
        startConfetti();
        audioEngine.playFanfare();
    } else if (screenKey === 'menu' || screenKey === 'splash') {
        audioEngine.stopMusic();
        stopConfetti();
    }
}

function setupSession(mode) {
    currentSessionExercises = [];
    
    if (mode === 'boca') {
        currentSessionExercises = shuffleArray(EXERCISE_DATABASE.boca);
    } else if (mode === 'lengua') {
        currentSessionExercises = shuffleArray(EXERCISE_DATABASE.lengua);
    } else if (mode === 'aleatorio') {
        const combined = [...EXERCISE_DATABASE.boca, ...EXERCISE_DATABASE.lengua];
        currentSessionExercises = shuffleArray(combined).slice(0, 8);
    } else if (mode === 'completa') {
        const combinedAll = [...EXERCISE_DATABASE.lengua, ...EXERCISE_DATABASE.boca];
        currentSessionExercises = shuffleArray(combinedAll);
    }

    currentIndex = 0;
    isPaused = false;
    elements.btnPlayPause.innerText = "⏸️ Pausa";
    
    // Encendido limpio del canal de audio correspondiente
    audioEngine.startMusic(mode);
    
    loadExercise();
    showScreen('exercise');
}

function loadExercise() {
    if (currentSessionExercises.length === 0) return;
    
    const exercise = currentSessionExercises[currentIndex];
    const folder = exercise.id.startsWith('b_') ? 'boca' : 'lengua';
    
    elements.exerciseTitle.innerText = exercise.name;
    elements.exerciseImg.src = `${folder}/${exercise.file}`;
    
    elements.exerciseImg.onerror = () => {
        elements.exerciseImg.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24'><text x='50%' y='50%' font-size='16' dominant-baseline='middle' text-anchor='middle'>👅</text></svg>";
    };

    elements.progressText.innerText = `Ejercicio ${currentIndex + 1} de ${currentSessionExercises.length}`;
    const percentage = ((currentIndex + 1) / currentSessionExercises.length) * 100;
    elements.progressBarFill.style.width = `${percentage}%`;
    
    elements.feedbackBubble.innerText = FEEDBACK_PHRASES[Math.floor(Math.random() * FEEDBACK_PHRASES.length)];
    
    startExerciseTimer();
}

function startExerciseTimer() {
    clearInterval(timerInterval);
    currentProgressTime = 0;
    elements.timerBar.style.width = '0%';
    
    const steps = 100;
    const intervalStepTime = (timerDuration * 1000) / steps;
    
    timerInterval = setInterval(() => {
        if (!isPaused) {
            currentProgressTime++;
            elements.timerBar.style.width = `${currentProgressTime}%`;
            
            if (currentProgressTime >= steps) {
                clearInterval(timerInterval);
                goToNextExercise();
            }
        }
    }, intervalStepTime);
}

function goToNextExercise() {
    if (currentIndex < currentSessionExercises.length - 1) {
        currentIndex++;
        loadExercise();
        audioEngine.playTick();
    } else {
        showScreen('congrats');
    }
}

function goToPrevExercise() {
    if (currentIndex > 0) {
        currentIndex--;
        loadExercise();
        audioEngine.playPop();
    }
}

// 7. ASIGNACIÓN DE EVENTOS CON CAPTURA DE AUDIO INTERACTIVO
elements.btnStart.addEventListener('click', () => {
    audioEngine.playPop();
    showScreen('menu');
});

elements.btnHome.addEventListener('click', () => {
    audioEngine.playPop();
    showScreen('menu');
});

elements.btnPrev.addEventListener('click', () => {
    goToPrevExercise();
});

elements.btnNext.addEventListener('click', () => {
    goToNextExercise();
});

elements.btnRepeat.addEventListener('click', () => {
    audioEngine.playPop();
    startExerciseTimer();
});

elements.btnPlayPause.addEventListener('click', () => {
    isPaused = !isPaused;
    elements.btnPlayPause.innerText = isPaused ? "▶️ Seguir" : "⏸️ Pausa";
    
    if (isPaused) {
        audioEngine.pauseMusic();
    } else {
        audioEngine.resumeMusic();
    }
});

elements.btnFinish.addEventListener('click', () => {
    audioEngine.playPop();
    showScreen('menu');
});

elements.menuButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        audioEngine.playPop();
        const mode = e.currentTarget.getAttribute('data-mode');
        setupSession(mode);
    });
});


// 8. MOTOR GRÁFICO DE CONFETI NATIVO
let confettiCtx = elements.confettiCanvas.getContext('2d');
let confettiPieces = [];
let confettiActive = false;
let confettiAnimationId = null;

function resizeConfettiCanvas() {
    elements.confettiCanvas.width = window.innerWidth;
    elements.confettiCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeConfettiCanvas);
resizeConfettiCanvas();

function startConfetti() {
    confettiActive = true;
    confettiPieces = [];
    const colors = ['#3B82F6', '#60A5FA', '#FCD34D', '#34D399', '#F472B6'];
    
    for (let i = 0; i < 100; i++) {
        confettiPieces.push({
            x: Math.random() * elements.confettiCanvas.width,
            y: Math.random() * elements.confettiCanvas.height - elements.confettiCanvas.height,
            size: Math.random() * 8 + 6,
            color: colors[Math.floor(Math.random() * colors.length)],
            speed: Math.random() * 3 + 2,
            wobble: Math.random() * 1
        });
    }
    updateConfetti();
}

function updateConfetti() {
    if (!confettiActive) return;
    confettiCtx.clearRect(0, 0, elements.confettiCanvas.width, elements.confettiCanvas.height);
    
    confettiPieces.forEach(p => {
        p.y += p.speed;
        p.x += Math.sin(p.wobble) * 1;
        p.wobble += 0.05;
        
        if (p.y > elements.confettiCanvas.height) {
            p.y = -20;
            p.x = Math.random() * elements.confettiCanvas.width;
        }
        
        confettiCtx.fillStyle = p.color;
        confettiCtx.fillRect(p.x, p.y, p.size, p.size);
    });
    
    confettiAnimationId = requestAnimationFrame(updateConfetti);
}

function stopConfetti() {
    confettiActive = false;
    cancelAnimationFrame(confettiAnimationId);
    confettiCtx.clearRect(0, 0, elements.confettiCanvas.width, elements.confettiCanvas.height);
}