// --------------------------------  CONFIGURACIÓN DEL ESTADO GLOBAL DE LA PARTIDA --------------------------------------
let puntuacion = 0;
let descartesRestantes = 3;
let columnas = [[], [], [], []]; // Arreglo bidimensional que representa las 4 columnas
let cartaActual = null;
let proximaCarta = null;
let juegoActivo = true;
let columnaVictoriaSeleccionada = null; // Guarda la columna que llegó a 2048 para su limpieza externa

// Pool numérico para la generación aleatoria de cartas jugables 
// cartas que se generaran al azar al inciar la partida
const VALORES_DISPONIBLES = [2, 4, 8, 16, 32, 64];

// MAPA DE TRADUCCIÓN: Vincula el cálculo matemático con las cartas de su nro correspondiente
const MAPA_CARTAS = {
    2: 'carta1.png',
    4: 'carta2.png',
    8: 'carta3.png',
    16: 'carta4.png',
    32: 'carta5.png',
    64: 'carta6.png',
    128: 'carta7.png',
    256: 'carta8.png',
    512: 'carta9.png',
    1024: 'carta10.png',
    2048: 'carta11.png'
};

// --- CAPTURA DE COMPONENTES DEL DOM ---
// valores que piden el id a la estructura index.html
const elPuntuacion = document.getElementById('valor-puntuacion');
const elDescartesRestantes = document.getElementById('descarte-restantes');
const elImgDescarte = document.getElementById('imagen-descarte');
const elImgActual = document.getElementById('imagen-actual');
const elImgProxima = document.getElementById('imagen-proxima');

// Componentes de las Ventanas de victoria y derrota
const elModalVictoria = document.getElementById('modal-victoria');
const elModalDerrota = document.getElementById('modal-derrota');
const elPuntuacionFinal = document.getElementById('puntuacion-final');

//----------------------------------------------------------------------------------------------------------------------------------

// --- DISPARADOR DE ARRANQUE ---

/*Comienza el juego cuando el navegador termina de leer y procesar el html
  inicializarMesaDeJuego() - monta las variables en memoria
  registrarControladoresEventos() - activar la escucha del mouse
*/
document.addEventListener('DOMContentLoaded', () => {
    inicializarMesaDeJuego();
    registrarControladoresEventos();
});

// Resetea todas las variables del sistema para una nueva partida
function inicializarMesaDeJuego() {
    puntuacion = 0; // puntnacion de comienzo
    descartesRestantes = 3; // nro de descartes por defecto
    columnas = [[], [], [], []]; // nuevas columnas para un nuevo juego
    juegoActivo = true; 
    columnaVictoriaSeleccionada = null;
    
    // Ocultar capas de victoria y derrota
    if (elModalVictoria) elModalVictoria.classList.add('oculto');
    if (elModalDerrota) elModalDerrota.classList.add('oculto');
    
    // Inicializar el mazo de juego - reparte de manera aleatoria las 2 primeras 
    // cartas de juego: la primera que puedes arrojar y la proxima a obtener
    cartaActual = obtenerValorAleatorio(); 
    proximaCarta = obtenerValorAleatorio();
    
    // Sincronizar la vista
    actualizarInterfazGrafica(); // borra las cartas visuales viejas y coloca las nuevas en el mazo
}

// --- FUNCIONES DE ARRASTRE Y SOLTADO (DRAG AND DROP) -----------------------------------------------------------------------

// Se ejecuta en el instante en que el usuario hace clic sostenido en la carta actual
function dragStart(evento) {
    // si perdiste o ganaste "congela" la carta, haciendo que no se mueva
    if (!juegoActivo) {
        evento.preventDefault();
        return;
    }
    // Guardamos una variable temporal indicando que estamos arrastrando una carta válida
    evento.dataTransfer.setData("text/plain", "carta-en-vuelo");
}

// Permite que el navegador acepte soltar elementos sobre la columna
function allowDrop(evento) {
    evento.preventDefault();
}

// Se ejecuta cuando el jugador suelta la carta sobre una columna específica
function dropCard(evento, indiceColumna) {
    evento.preventDefault(); // permitir que el navegador deje que se reciba una carta
    if (!juegoActivo) return; 

    const data = evento.dataTransfer.getData("text/plain");

    // Si el paquete dice exactamente "carta-en-vuelo", el juego confirma que es una jugada valida y deja arrojarla en una columna
    if (data === "carta-en-vuelo") {
        // Ejecutamos la misma acción de colocación que antes hacías con el clic
        ejecutarColocacionCarta(indiceColumna);
    }
}

// Se ejecuta cuando el jugador suelta la carta actual sobre el cuadro de descartes
function dropEnDescarte(evento) {
    evento.preventDefault();
    if (!juegoActivo) return;

    const data = evento.dataTransfer.getData("text/plain");
    // Verificamos que lo que se está soltando sea la carta en vuelo
    if (data === "carta-en-vuelo") {
        procesarDescarteCarta(); // resta un uso de los descartes
    }
}

// Configura los escuchadores de eventos para los clics del usuario
function registrarControladoresEventos() {
    
    // Captura el elemento "cuadro-descarte" del index.html, donde si existe el jugador puede lanzar 
    // la carta que quiere descartar o solo hacer un clic directo sobre el botón de descartes para quemar la carta de forma rápida.
    const disparadorDescarte = document.getElementById('cuadro-descarte');
    if (disparadorDescarte) {
        disparadorDescarte.addEventListener('click', () => {
            if (!juegoActivo) return;
            procesarDescarteCarta();
        }); // si el juego termino, "return" bloquea el botón para que no pase nada al presionarlo.
    }

    // Vinculación de los botones de reinicio y continuación
    document.getElementById('btn-reiniciar').addEventListener('click', inicializarMesaDeJuego);
    document.getElementById('btn-derrota-reiniciar').addEventListener('click', inicializarMesaDeJuego);
    document.getElementById('btn-victoria-reiniciar').addEventListener('click', inicializarMesaDeJuego);
    
    // Botón Continuar (Limpia por completo la columna que acumuló el 2048)
    document.getElementById('btn-victoria-continuar').addEventListener('click', () => {
        if (columnaVictoriaSeleccionada !== null) {
            columnas[columnaVictoriaSeleccionada] = []; // Limpieza de la pila
            columnaVictoriaSeleccionada = null;
        }
        if (elModalVictoria) elModalVictoria.classList.add('oculto');
        juegoActivo = true;
        actualizarInterfazGrafica();
        evaluarCondicionDerrota(); // Valida si otra columna estaba en estado crítico
    });
}

// --- REGLAS INTERNAS DEL JUEGO ---------------------------------------------------------------------------------------
// motores matemáticos y de control de turnos del juego

// mezcla la mano y arroja una carta al azar
function obtenerValorAleatorio() {
    // Math.random() - Genera un número decimal aleatorio entre 0 y 1
    // VALORES_DISPONIBLES.length - Multiplica ese decimal por la cantidad de elementos que tiene tu arreglo de cartas permitidas(2,4,8,16,....)
    // Math.floor(...) - Redondea valores decimales
    const indiceCalculado = Math.floor(Math.random() * VALORES_DISPONIBLES.length);
    return VALORES_DISPONIBLES[indiceCalculado];
}

// Controla el movimiento de la carta actual hacia una columna (Fase 2)
function ejecutarColocacionCarta(indiceColumna) {
    let pila = columnas[indiceColumna]; //creamos acceso directo(puntero) para capturar la columna en la memoria
    // Validación de tope estructural (máximo 8 cartas)
    if (pila.length >= 8) {
        if (pila[pila.length - 1] !== cartaActual) {
            return; // Movimiento inválido
        }
    }
    
    // Insertar la carta en el arreglo de la columna
    pila.push(cartaActual);
    
    // Ejecutar sumas recursivas en cadena
    ejecutarFusionRecursiva(indiceColumna); // verificacion para la "fusion en cadena"
    
    // Primero avanzamos el mazo de cartas
    cartaActual = proximaCarta;
    proximaCarta = obtenerValorAleatorio(); // siguiente carta aleatoria del mazo
    
    // Luego actualizamos los gráficos del DOM
    actualizarInterfazGrafica(); // limpia los bloques anteriores y insertan nuevas cartas basado en los nuevos nros calculados
    
    // POR ÚLTIMO, comprobamos si la nueva carta condena al jugador
    if (juegoActivo) {
        evaluarCondicionDerrota(); // verifica si ya no jugadas posibles en la columna llena
    }
}

// esto es un cierre de seguridad para garantizar que se refresque la pantalla
// cada vez que el jugador descarte y de inmediato mostrar los descartes restantes que quedan.
actualizarInterfazGrafica();
if (juegoActivo) {
    evaluarCondicionDerrota();
}

/** ---------------------------------------------------------------------------------------------------------------------------------------
 * RECURSIVIDAD OBLIGATORIA: Reacción en cadena -"fusión múltiple"
 * Evalúa de forma iterativa y matemática las fusiones consecutivas en una columna
 */
function ejecutarFusionRecursiva(indiceColumna) {
    let pila = columnas[indiceColumna]; // Crea una referencia directa a la columna seleccionada en memoria
    
    // Si la pila posee menos de 2 cartas, no existe posibilidad física de fusión
    if (pila.length < 2) return;
    
    //Calcula las posiciones de las dos últimas cartas en el arreglo (la que acabas de colocar y la que está inmediatamente abajo).
    let indiceTope = pila.length - 1;
    let indiceSubyacente = indiceTope - 1;
    
    // Comparación de valores, si son indenticos inicia la fusion
    if (pila[indiceTope] === pila[indiceSubyacente]) {
        let valorFusionado = pila[indiceSubyacente] * 2; // Duplicación exponencial (Ex: 2 + 2 = 4)
        
        // Remover del arreglo los dos elementos emparejados e insertar el producto obtenido
        pila.splice(indiceSubyacente, 2);
        pila.push(valorFusionado);
        
        // Incrementar el marcador general de puntos
        puntuacion += valorFusionado;
        
        // CONTROL DE VICTORIA: Si la carta resultante llega a 2048
        if (valorFusionado === 2048) {
            dispararEstadoVictoria(indiceColumna);
            return; // Detener recursión para abrir paso a la interfaz modal
        }
        
        // LLAMADA RECURSIVA: Vuelve a comprobar si el nuevo valor interacciona con la carta que ahora quedó abajo
        ejecutarFusionRecursiva(indiceColumna);
    }
}

// Ejecuta el descarte de cartas, permitiendo al jugador descartar la carta actual de su mano
function procesarDescarteCarta() {
    // Bloqueo de seguridad. Si ya consumiste tus 3 intentos, la función se interrumpe y no te permite hacer nada
    if (descartesRestantes <= 0) return;
    
    descartesRestantes--; // resta la oportunidad de descarte
    
    // Avanzar cartas antes de validar estados
    cartaActual = proximaCarta;
    proximaCarta = obtenerValorAleatorio();
    
    actualizarInterfazGrafica(); 
    
    if (juegoActivo) {
        evaluarCondicionDerrota();
    }
}

// esto es un cierre de seguridad para garantizar que se refresque la pantalla
// cada vez que el jugador descarte y de inmediato mostrar los descartes restantes que quedan.
actualizarInterfazGrafica();
if (juegoActivo) {
    evaluarCondicionDerrota();
}

/**
 * CONDICIÓN DE DERROTA SOLICITADA:
 * El jugador pierde instantáneamente si AL MENOS UNA sola columna alcanza el tope
 * de 8 cartas y su carta superior no puede fusionarse con la carta actual del mazo.
 */
function evaluarCondicionDerrota() {
    let perdiste = false;
    
    //  si una columna se llena, el juego te da una última oportunidad solo si la carta actual de tu mano puede salvarte fusionándose
    for (let i = 0; i < 4; i++) {
        // Si la columna i alcanzó su límite máximo de 8 elementos
        if (columnas[i].length >= 8) {
            // Y el número del tope es distinto a la nueva carta que el jugador tiene en la mano
            if (columnas[i][columnas[i].length - 1] !== cartaActual) {
                perdiste = true;
                break; // Detener evaluación
            }
        }
    }
    
    // Si se activó el sensor de pérdida, desplegamos el modal de derrota
    if (perdiste) {
        juegoActivo = false;
        if (elPuntuacionFinal) elPuntuacionFinal.textContent = puntuacion; // guarda el récord en el texto final de la ventana de derrota
        if (elModalDerrota) elModalDerrota.classList.remove('oculto');  //remueve la clase .oculto de la ventana de derrota para desplegar el telón negro en pantalla.
    }
}

// Se activa desde la fusión recursiva si alcanzaste el valor 2048. Apaga los controles lógicos del juego (juegoActivo = false),
// almacena cuál fue la columna ganadora por si el usuario desea seguir jugando y remueve la clase 
// ".oculto" de la ventana de victoria para celebrar el logro.
function dispararEstadoVictoria(indiceColumna) {
    juegoActivo = false;
    columnaVictoriaSeleccionada = indiceColumna; // Registrar el índice para la funcionalidad de continuar
    if (elModalVictoria) elModalVictoria.classList.remove('oculto'); // Lanzar pantalla de victoria
}

// --- FUNCIÓN DE REDIBUJADO Y SINCRONIZACIÓN VISUAL (DOM) --------------------------------------------------------------------------------------

// traduce todo lo que el javascript procesa en la memoria de la computadora a elementos visuales del html
// para que se pueden ver los cambios.
function actualizarInterfazGrafica() {
    // 1) Imprimir marcador de puntuación
    if (elPuntuacion) elPuntuacion.textContent = puntuacion; // toma la variable de "puntuacion" y lo arroja como texto en el html
    
    // 2) Renderizar dinámicamente las pilas de cartas dentro de las columnas
    for (let i = 0; i < 4; i++) { // se ejecuta un bucle para recorrer las 4 columnas
        const contenedorColumnaDOM = document.querySelector(`.columna-cartas[data-col="${i}"]`); // limpia las columnas por completo
        if (contenedorColumnaDOM) { 
            contenedorColumnaDOM.innerHTML = '';  // limpia las columnas por completo
            
            // Recorre los números almacenados en el arreglo de esa columna
            columnas[i].forEach(valorTarjeta => {
                const elementoImagen = document.createElement('img'); // por cada nro, crea esta etiqueta 
                const nombreArchivoImagen = MAPA_CARTAS[valorTarjeta]; // busca el valor correspondiente de la carta
                
                // asigna la ruta de su archivo local y le añade la clase ".card-item-img" para el efecto de cascada
                // y la añade físicamente al contenedor con "appendChild"
                elementoImagen.src = `cartas/${nombreArchivoImagen}`; 
                elementoImagen.alt = `Carta ${valorTarjeta}`;
                elementoImagen.className = 'card-item-img';  //
                
                contenedorColumnaDOM.appendChild(elementoImagen);
            });
        }
    }
    
    // 3) Forzar atributos y remover ocultación

    // aseguramos que la carta actual del mazo y la proxima carta cambien de imagen correctamente y nunca se queden invisibles
    if (cartaActual && elImgActual) { // control de seguridad para evitar que el juego tire un error y se detenga si falta la carta que esta buscando en la memoria
        elImgActual.setAttribute('src', `cartas/${MAPA_CARTAS[cartaActual]}`); // Cambia la ruta de la imagen en el HTML.
        elImgActual.classList.remove('oculto'); // remueve el ".oculto" para garantizar que se reactive 
        elImgActual.style.display = "block"; // Rompe cualquier bloqueo de CSS
    }

    // hace lo mismo, pero aplicando la lógica sobre el cuadro de la izquierda, donde se ve la carta del futuro turno
    if (proximaCarta && elImgProxima) {
        elImgProxima.setAttribute('src', `cartas/${MAPA_CARTAS[proximaCarta]}`);
        elImgProxima.classList.remove('oculto');
        elImgProxima.style.display = "block"; // Rompe cualquier bloqueo de CSS
    }
    
    // 4) Actualizar estado de la sección de Descartes - control de los descartes restantes que le quedan al jugador

    // Toma el número de la variable del script (que empieza en 3 y va bajando) 
    // y lo escribe directamente como texto plano dentro del HTML.
    if (elDescartesRestantes) elDescartesRestantes.textContent = descartesRestantes;
    if (elImgDescarte) { // evalua la condicion de la oportunidad de seguir descartando
        if (descartesRestantes > 0) {
            elImgDescarte.src = 'cartas/cartaDescarte1.png'; // descartes restantes - aun puedes descatar
        } else {
            elImgDescarte.src = 'cartas/cartaDescarte0.png'; // boton de descartes desactivado - ya no tienes descartes
        }
    }
}