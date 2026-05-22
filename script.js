/**
 * VOCALAVENTURA - Core Engine de Gestión Pedagógica Orofacial
 * Desarrollado con Vanilla JS enfocado a Mobile-First e Inclusión Infantil
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
        { id: 'b_u', name: 'Boquita de patito U', file: 'bocu.jpg' } // Adaptación al archivo bocau.jpg fijado en requerimientos
    ],
    lengua: [
        { id: 'l_afuera', name: 'Lengua afuera', file: 'lenguaafuera.jpg' },
        { id: 'l_arriba', name: 'Lengua arriba tocando la nariz', file: 'lenguaarriba.jpg' },
        { id: 'l_curvada', name: 'Hacemos un tubito con la lengua', file: 'lenguacurvada.jpg' },
        { id: 'l_dentro', name: 'Lengua guardada adentro', file: 'lenguadentro.jpg' },
        { id: 'l_inf_der', name: 'Lengua abajo a la derecha', file: 'lenguainferiorderecha.jpg' },
        { id: 'l_inf_izq', name: 'Lengua abajo a la izquierda', file: 'lenguainferiorizquierda.jpg' },
        { id: 'l_relajada', name: 'Lengua descansando relajada', file: 'lenguarelajada.jpg' },
        { id: 'l_sup_izq', name: 'Lengua arriba a la izquierda', file: 'lenguasupeiorizquierda.jpg' }, // Respetando typo original del archivo
        { id: 'l_sup_der', name: 'Lengua arriba a la derecha', file: 'lenguasuperiorderecha.jpg' },
        { id: 'l_10', name: 'Movemos la lenguita libre', file: 'lengua_10.jpg' },
        { id: 'm_der', name: 'Inflamos la mejilla derecha', file: 'mejilladerecha.jpg' },
        { id: 'm_izq', name: 'Inflamos la mejilla izquierda', file: 'mejillaizquierda.jpg' }
    ]
};

// Frases motivacionales amigables sin connotación competitiva
const FEEDBACK_PHRASES = [
    "¡Lo estás haciendo increíble!",
    "¡Mírrate en el espejo si puedes!",
    "¡Muy buen movimiento!",
    "¡Tu boquita trabaja fantástico!",
    "¡Qué gran esfuerzo haces!",
    "¡Sigamos jugando juntos!",
    "¡Qué divertido es practicar!"
];

// 2. ESTADO DEL JUEGO
let currentSessionExercises = [];
let currentIndex = 0;
let isPaused = false;
let timerDuration = 7; // Segundos recomendados por ejercicio pedagógico
let timerInterval = null;
let currentProgressTime = 0;

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

// 4. CONTROLADOR DE AUDIO SINTÉTICO (Estructura nativa para feedback sonoro sin archivos)
const audioPlayer = {
    ctx: null,
    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    },
    playTone(freq, type, duration) {
        try {
            this.init();
            let osc = this.ctx.createOscillator();
            let gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch(e) { console.log('Audio no soportado o bloqueado'); }
    },
    playSuccess() {
        this.playTone(523.25, 'sine', 0.15); // Nota C5
        setTimeout(() => this.playTone(659.25, 'sine', 0.2), 120); // Nota E5
    },
    playTick() {
        this.playTone(800, 'triangle', 0.02);
    }
};

// 5. NAVEGACIÓN ENTRE PANTALLAS (SPA Manager)
function showScreen(screenKey) {
    clearInterval(timerInterval);
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenKey].classList.add('active');
    
    if (screenKey === 'congrats') {
        startConfetti();
        audioPlayer.playSuccess();
    } else {
        stopConfetti();
    }
}

// 6. CONTROLADOR DE SESIONES DE EJERCICIOS
function setupSession(mode) {
    currentSessionExercises = [];
    
    if (mode === 'boca') {
        currentSessionExercises = [...EXERCISE_DATABASE.boca];
    } else if (mode === 'lengua') {
        currentSessionExercises = [...EXERCISE_DATABASE.lengua];
    } else if (mode === 'aleatorio') {
        // Combina y desordena aleatoriamente
        const combined = [...EXERCISE_DATABASE.boca, ...EXERCISE_DATABASE.lengua];
        currentSessionExercises = combined.sort(() => Math.random() - 0.5).slice(0, 10); // Límite de 10 para no agotar al niño
    } else if (mode === 'completa') {
        currentSessionExercises = [...EXERCISE_DATABASE.lengua, ...EXERCISE_DATABASE.boca];
    }

    currentIndex = 0;
    isPaused = false;
    elements.btnPlayPause.innerText = "⏸️ Pausa";
    loadExercise();
    showScreen('exercise');
}

function loadExercise() {
    if (currentSessionExercises.length === 0) return;
    
    const exercise = currentSessionExercises[currentIndex];
    
    // Determinar la carpeta raíz basándonos en el ID
    const folder = exercise.id.startsWith('b_') ? 'boca' : 'lengua';
    
    // Inyección de contenido con rutas relativas limpias para GitHub Pages
    elements.exerciseTitle.innerText = exercise.name;
    elements.exerciseImg.src = `${folder}/${exercise.file}`;
    
    // Manejo de error por si algún archivo falta o tiene extensión diferente
    elements.exerciseImg.onerror = () => {
        // Fallback elegante usando otra imagen si hay fallos en producción
        elements.exerciseImg.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24'><text x='50%' y='50%' font-size='12' dominant-baseline='middle' text-anchor='middle'>👅</text></svg>";
    };

    // Actualización de UI e Indicadores Visuales
    elements.progressText.innerText = `Ejercicio ${currentIndex + 1} de ${currentSessionExercises.length}`;
    const percentage = ((currentIndex + 1) / currentSessionExercises.length) * 100;
    elements.progressBarFill.style.width = `${percentage}%`;
    
    // Rotar burbuja de texto de aliento de manera lúdica
    elements.feedbackBubble.innerText = FEEDBACK_PHRASES[Math.floor(Math.random() * FEEDBACK_PHRASES.length)];
    
    // Resetear y arrancar el temporizador visual
    startExerciseTimer();
}

// 7. MOTOR DEL TEMPORIZADOR VISUAL PEDAGÓGICO
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
        audioPlayer.playTick();
    } else {
        showScreen('congrats');
    }
}

function goToPrevExercise() {
    if (currentIndex > 0) {
        currentIndex--;
        loadExercise();
    }
}

// 8. EVENT LISTENERS PRINCIPALES
elements.btnStart.addEventListener('click', () => {
    audioPlayer.playSuccess();
    showScreen('menu');
});

elements.btnHome.addEventListener('click', () => {
    showScreen('menu');
});

elements.btnPrev.addEventListener('click', () => {
    goToPrevExercise();
});

elements.btnNext.addEventListener('click', () => {
    goToNextExercise();
});

elements.btnRepeat.addEventListener('click', () => {
    startExerciseTimer();
});

elements.btnPlayPause.addEventListener('click', () => {
    isPaused = !isPaused;
    elements.btnPlayPause.innerText = isPaused ? "▶️ Seguir" : "⏸️ Pausa";
});

elements.btnFinish.addEventListener('click', () => {
    showScreen('menu');
});

// Enlazar botones del menú con sus respectivas categorías
elements.menuButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        const mode = e.currentTarget.getAttribute('data-mode');
        setupSession(mode);
    });
});


// 9. MOTOR DE CONFETI EN CANVAS (Efecto nativo ligero para dispositivos limitados)
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