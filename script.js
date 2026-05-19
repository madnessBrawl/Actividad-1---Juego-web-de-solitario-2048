// --- CONFIGURACIÓN DE ESTADO GLOBAL ---
let score = 0;
let discardCount = 3;
let columns = [[], [], [], []]; // Representación de las 4 columnas (arrays de enteros)
let currentCard = null;
let nextCard = null;
let activeGame = true;
let targetWinColumn = null; // Almacena qué columna activó el estado 2048

// Valores posibles para cartas autogeneradas
const GENERATION_POOL = [2, 4, 8, 16, 32, 64];

// --- ELEMENTOS DEL DOM ---
const scoreDisplay = document.getElementById('puntuacion-valor');
const discardDisplay = document.getElementById('nro-descartes');
const discardImg = document.getElementById('imagen-descartes');
const imgCurrent = document.getElementById('imagen-carta-actual');
const imgNext = document.getElementById('siguiente-carta-imagen');

// ventanas emergentes de victoria y derrota
const modalWin = document.getElementById('ventana-de-victoria');
const modalLose = document.getElementById('ventana-de-derrota');
const finalScoreDisplay = document.getElementById('puntuacionTotal');

// --- INICIALIZADOR DE JUEGO ---
document.addEventListener('DOMContentLoaded', () => {
    initGame();
    setupEventListeners();
});

function initGame() {
    // Reestablecer variables de control
    score = 0;
    discardCount = 3;
    columns = [[], [], [], []];
    activeGame = true;
    targetWinColumn = null;
    
    // Ocultar capas modales
    modalWin.classList.add('oculta');
    modalLose.classList.add('oculta');
    
    // Generar cartas de inicio del mazo
    currentCard = getRandomCardValue();
    nextCard = getRandomCardValue();
    
    // Renderizado base de pantalla
    updateUI();
}

// Registro de controladores de eventos de usuario (clics en columnas, área de descartes, botones de reinicio y continuar)
function setupEventListeners() {
    // Clics en columnas del tablero
    document.querySelectorAll('.columna').forEach(columnElement => {
        columnElement.addEventListener('click', () => {
            if (!activeGame) return;
            const colIndex = parseInt(columnElement.getAttribute('data-col'));
            handleColumnAction(colIndex);
        });
    });

    // Acción de Descarte
    document.getElementById('caja-de-descartes').addEventListener('click', () => {
        if (!activeGame) return;
        executeDiscard();
    });

    // Botones de reinicio estándar e interfaces modales
    document.getElementById('boton-reinicio').addEventListener('click', initGame);
    document.getElementById('boton-perdiste-reiniciar').addEventListener('click', initGame);
    document.getElementById('boton-ganas-reiniciar').addEventListener('click', initGame);
    
    // Botón Continuar (Limpia la columna ganadora de 2048) 
    document.getElementById('boton-ganas-continuar').addEventListener('click', () => {
        if (targetWinColumn !== null) {
            columns[targetWinColumn] = []; // Limpieza total de la columna 
            targetWinColumn = null;
        }
        modalWin.classList.add('oculta');
        activeGame = true;
        updateUI();
        checkLossCondition(); // Validar si el estado previo guardó bloqueos
    });
}

// --- MECÁNICAS E INGENIERÍA DEL JUEGO ---

// Retorna un número entero aleatorio del pool permitido 
function getRandomCardValue() {
    const randomIndex = Math.floor(Math.random() * GENERATION_POOL.length);
    return GENERATION_POOL[randomIndex];
}

// Procesa la colocación de la carta en la columna elegida 
function handleColumnAction(colIndex) {
    let col = columns[colIndex];
    
    // Validación de tope estructural: máximo de 8 cartas permitidas por pila 
    if (col.length >= 8) {
        // Excepción de diseño: Se permite si y solo si la carta entrante se fusionará inmediatamente
        if (col[col.length - 1] !== currentCard) {
            return; // Movimiento inválido, columna totalmente colapsada
        }
    }
    
    // Insertar carta al final (posición superior visual) 
    col.push(currentCard);
    
    // Ejecutar sumas automáticas y reacciones en cadena de forma recursiva 
    processRecursiveFusion(colIndex);
    
    // Avanzar flujo de cartas del mazo
    currentCard = nextCard;
    nextCard = getRandomCardValue();
    
    // Sincronizar datos y comprobar estados de juego
    updateUI();
    if (activeGame) {
        checkLossCondition();
    }
}

/**
 * RECURSIÓN OBLIGATORIA: Fusión en cadena 
 * Evalúa y procesa si las dos últimas cartas de la columna son iguales
 */
function processRecursiveFusion(colIndex) {
    let col = columns[colIndex];
    
    // Si hay menos de dos cartas, es matemáticamente imposible fusionar
    if (col.length < 2) return;
    
    let topIdx = col.length - 1;
    let underIdx = topIdx - 1;
    
    // Comprobación de equivalencia entre el tope y la carta subyacente 
    if (col[topIdx] === col[underIdx]) {
        let doubleValue = col[underIdx] * 2; // Suma/Fusión exponencial 
        
        // Remover elementos emparejados e insertar el producto de la fusión
        col.splice(underIdx, 2);
        col.push(doubleValue);
        
        // Sumar puntos al acumulador global 
        score += doubleValue;
        
        // DISPARADOR DE VICTORIA: Si la carta resultante es igual a 2048 
        if (doubleValue === 2048) {
            triggerVictory(colIndex);
            return; 
        }
        
        // RECURSIÓN NATIVA: Volver a evaluar si este nuevo valor se acopla con el de abajo 
        processRecursiveFusion(colIndex);
    }
}

// Acción del área de Descartes
function executeDiscard() {
    if (discardCount <= 0) return; // Sin intentos restantes
    
    discardCount--;
    
    // Quemar carta actual y avanzar mazo
    currentCard = nextCard;
    nextCard = getRandomCardValue();
    
    updateUI();
    checkLossCondition();
}

// Comprobación automática de derrota: Si alguna columna alcanza 8 cartas sin posibilidad de fusión, el juego termina 
function checkLossCondition() {
    let loseDetected = false;
    
    // Evaluamos cada una de las 4 columnas individualmente
    for (let i = 0; i < 4; i++) {
        // Si una columna ya alcanzó el límite máximo de 8 cartas
        if (columns[i].length >= 8) {
            // Y la carta actual del mazo NO es igual a la carta del tope (no se pueden sumar)
            if (columns[i][columns[i].length - 1] !== currentCard) {
                loseDetected = true; // Se activa la condición de pérdida
                break; // Detenemos el ciclo porque ya se detectó la derrota en esta columna
            }
        }
    }
    
    // Si se detectó que una columna colapsó sin opción a suma, termina el juego
    if (loseDetected) {
        activeGame = false;
        finalScoreDisplay.textContent = score;
        modalLose.classList.remove('oculta'); // Desplegamos la pantalla de "Perdiste la partida"
    }
}

// Disparador de estado ganador
function triggerVictory(colIndex) {
    activeGame = false;
    targetWinColumn = colIndex; // Registrar columna para posible limpieza posterior [cite: 35]
    modalWin.classList.remove('oculta');
}

// --- FUNCIÓN DE RENDERIZADO GENERAL (Sincronización DOM) ---
function updateUI() {
    // 1. Actualizar Marcador
    scoreDisplay.textContent = score;
    
    // 2. Dibujar las Pilas de Cartas en sus columnas correspondientes
    for (let i = 0; i < 4; i++) {
        const columnDOM = document.querySelector(`.columna[data-col="${i}"]`);
        columnDOM.innerHTML = ''; // Limpiar renderizado anterior
        
        // Iterar los elementos internos del array de la columna
        columns[i].forEach(cardValue => {
            const imgCard = document.createElement('img');
            imgCard.src = `cartas/${cardValue}.png`; // Mapeo dinámico del archivo de imagen (ej: 4.png)
            imgCard.alt = cardValue;
            imgCard.className = 'card-item-img';
            columnDOM.appendChild(imgCard);
        });
    }
    
    // 3. Renderizar Mazo (Carta Actual y Siguiente)
    if (currentCard) {
        imgCurrent.src = `cartas/${currentCard}.png`;
        imgCurrent.classList.remove('hidden');
    }
    if (nextCard) {
        imgNext.src = `cartas/${nextCard}.png`;
        imgNext.classList.remove('oculta');
    }
    
    // 4. Actualizar Estado Gráfico de la Sección de Descartes
    discardDisplay.textContent = discardCount;
    if (discardCount > 0) {
        discardImg.src = 'cartas/cartaDescarte1.png'; // Estado activo
    } else {
        discardImg.src = 'cartas/cartaDescarte0.png'; // Cambio a estado inactivo/gris
    }
}