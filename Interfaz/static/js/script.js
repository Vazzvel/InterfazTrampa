//--------------------------------------------------------------------------------
// #####--- VIDEO ---#####
// Función para cambiar a cámara en vivo
function switchToLiveCamera() {
    const liveVideo = document.getElementById('liveVideo');
    const localVideo = document.getElementById('localVideo');
    
    // Mostrar video en vivo y ocultar reproductor local
    liveVideo.style.display = 'block';
    localVideo.style.display = 'none';
    localVideo.pause();
    
    // Actualizar estilos de botones
    document.getElementById('btnLive').classList.add('btn-azul');
    document.getElementById('btnFile').classList.remove('btn-azul');
}

// Variable para almacenar la URL anterior
let currentVideoURL = null;

// Manejar selección de archivo
document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const liveVideo = document.getElementById('liveVideo');
    const localVideo = document.getElementById('localVideo');
    
    // Liberar la URL anterior si existe
    if (currentVideoURL) {
        URL.revokeObjectURL(currentVideoURL);
    }
    
    // Crear nueva URL temporal para el video seleccionado
    currentVideoURL = URL.createObjectURL(file);
    
    // Configurar el elemento de video
    localVideo.src = currentVideoURL;
    localVideo.style.display = 'block';
    liveVideo.style.display = 'none';
    
    // Actualizar estilos de botones
    document.getElementById('btnLive').classList.remove('btn-azul');
    document.getElementById('btnFile').classList.add('btn-azul');
    
    // Reproducir automáticamente (opcional)
    localVideo.play().catch(e => console.log("Autoplay no permitido:", e));
    
    // Limpiar el input para permitir seleccionar el mismo archivo nuevamente
    e.target.value = '';
});

// Inicializar
switchToLiveCamera();

//---------------------------------------------------------------------------------
// #####--- MQTT Y BOTONES ---#####
// --- Variables MQTT ---
const broker = "wss://test.mosquitto.org:8081";  // Cambia si usas otro broker
const topicBase = "LEAI4/trampa/actuadores/";   // Tópico base para sensores y actuadores
const topicDetecciones = "LEAI4/trampa/detecciones/"; //Tópico base para las detecciones
const client = mqtt.connect(broker);



// --- Cambio de estado en botones ---
function toggleEstado(id) {
    const boton = document.getElementById(id);

    // Definir los textos y los estados (azul por defecto y rojo cuando cambian)
    const estados = {
        'tipo': { textos: ['Automático', 'Manual'], estadoBase: 'Automático' },
        'valvulaDeposito': { textos: ['Encendido', 'Apagado'], estadoBase: 'Encendido' },
        'valvulaCanal': { textos: ['Encendido', 'Apagado'], estadoBase: 'Encendido' },
        'filtro': { textos: ['Grandes', 'Chicos'], estadoBase: 'Grandes' },
        'alcohol': { textos: ['Encendido', 'Apagado'], estadoBase: 'Encendido' }
    };

    if (!estados[id]) {
        console.error(`El botón con ID "${id}" no tiene un estado definido.`);
        return;
    }

    const { textos, estadoBase } = estados[id];

    // Determinar el nuevo estado
    let nuevoEstado;
    if (boton.textContent === textos[0]) {
        boton.textContent = textos[1];
        nuevoEstado = textos[1];

        // Cambiar a rojo
        boton.classList.remove('btn-azul');
        boton.classList.add('btn-rojo');
    } else {
        boton.textContent = textos[0];
        nuevoEstado = textos[0];

        // Regresar a azul
        boton.classList.remove('btn-rojo');
        boton.classList.add('btn-azul');
    }

    // Publicar en MQTT el nuevo estado
    client.publish(topicBase + id, nuevoEstado);
    console.log(`Enviado MQTT: ${topicBase + id} -> ${nuevoEstado}`);

    // Si el botón es "tipo", activar función toggleTelemetria()
    if (id === 'tipo') {
        toggleTelemetria();
    }
}

// --- Evento para enviar datos al presionar el botón "Mover" ---
document.getElementById("btnMover").addEventListener("click", function () {
    const accion = document.getElementById("accion").value;
    const velocidad = document.getElementById("velocidad").value;

    if (velocidad === "" || isNaN(velocidad) || velocidad < 0 || velocidad > 255) {
        alert("Ingresa una velocidad válida entre 0 y 255");
        return;
    }

    // Publicar estado (Abrir/Cerrar)
    client.publish(topicBase + "Embolo/Estado", accion);
    console.log(`Estado enviado: ${accion}`);

    // Publicar velocidad
    client.publish(topicBase + "Embolo/Velocidad", velocidad);
    console.log(`Velocidad enviada: ${velocidad}`);
    
});

// --- Evento para detener el movimiento del émbolo ---
document.getElementById("btnAlto").addEventListener("click", function () {
    client.publish(topicBase + "Embolo/Velocidad", "0"); // Enviar velocidad 0
    console.log("Velocidad enviada: 0");
});

// --- Suscripción a los tópicos MQTT ---
client.on("connect", () => {
    console.log("Conectado a MQTT");
    
    especies.forEach(especie => {
        client.subscribe(especie.topic); // Suscribirse a cada tópico
    });

    // Suscripción a los temas de sensores
    client.subscribe(topicBase + "tipo");
    client.subscribe(topicBase + "valvulaDeposito");
    client.subscribe(topicBase + "valvulaCanal");
    client.subscribe(topicBase + "filtro");
    client.subscribe(topicBase + "alcohol");
});

// --- Función para manejar los mensajes MQTT entrantes ---
client.on("message", (topic, message) => {
    // Manejar mensajes de actuadores
    if (topic.startsWith(topicBase)) {
        const estado = message.toString();
        const id = topic.replace(topicBase, "");
        
        const boton = document.getElementById(id);
        if (!boton) {
            console.error(`Botón con ID "${id}" no encontrado`);
            return;
        }

        // Actualizar el estado del botón según el mensaje recibido
        const estados = {
            'tipo': { textos: ['Automático', 'Manual'], estadoBase: 'Automático' },
            'valvulaDeposito': { textos: ['Encendido', 'Apagado'], estadoBase: 'Encendido' },
            'valvulaCanal': { textos: ['Encendido', 'Apagado'], estadoBase: 'Encendido' },
            'filtro': { textos: ['Grandes', 'Chicos'], estadoBase: 'Grandes' },
            'alcohol': { textos: ['Encendido', 'Apagado'], estadoBase: 'Encendido' }
        };

        const { textos } = estados[id];

        // Si el estado recibido es igual al primer texto (por ejemplo, "Automático" o "Encendido")
        if (estado === textos[0]) {
            boton.textContent = textos[0];
            boton.classList.remove('btn-rojo');
            boton.classList.add('btn-azul');
        } else if (estado === textos[1]) {
            boton.textContent = textos[1];
            boton.classList.remove('btn-azul');
            boton.classList.add('btn-rojo');
        }
    }
    
    // Buscar la especie correspondiente al tópico
    const especie = especies.find(e => e.topic === topic);
    if (especie) {
        document.getElementById(`contador-${especie.id}`).textContent = message.toString();
    }
});

// --- Función para mostrar/ocultar los contenedores de telemetría ---
function toggleTelemetria() {
    const contenedores = document.querySelectorAll('.contenedor-telemetria');
    contenedores.forEach(contenedor => {
        contenedor.style.display = contenedor.style.display === 'none' ? 'block' : 'none';
    });
}

// Configuración de especies y sus tópicos MQTT
const especies = [
    { id: 'aurantii',   nombre: 'Aphis aurantii',       topic: 'LEAI4/trampa/detecciones/aphididae/aurantii' },
    { id: 'citricidus', nombre: 'Toxoptera citricidus', topic: 'LEAI4/trampa/detecciones/aphididae/citricidus' },
    { id: 'craccivora', nombre: 'Aphis craccivora',     topic: 'LEAI4/trampa/detecciones/aphididae/craccivora' },
    { id: 'gossypii',   nombre: 'Aphis gossypii',       topic: 'LEAI4/trampa/detecciones/aphididae/gossypii' },
    { id: 'nerii',      nombre: 'Aphis nerii',          topic: 'LEAI4/trampa/detecciones/aphididae/nerii' },
    { id: 'spiraecola', nombre: 'Aphis spiraecola',     topic: 'LEAI4/trampa/detecciones/aphididae/spiraecola' },
    { id: 'spp',        nombre: 'Díptera Spp',          topic: 'LEAI4/trampa/detecciones/diptera/Spp' }
];

// Inicializar la interfaz al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    const contenedor = document.querySelector('.contenedor-lista');
    contenedor.innerHTML = ''; // Limpiar el ejemplo estático
    
    // Crear un bloque para cada especie
    Object.keys(especiesConfig).forEach(especieId => {
        const especie = especiesConfig[especieId];
        const especieHTML = `
            <div id="especie-${especieId}" class="especie-item">
                <span class="especie-nombre">${especie.nombre}:</span>
                <span id="contador-auto-${especieId}" class="contador-auto">0</span>
                <div class="contador-control">
                    <button class="btn-contador" onclick="actualizarContador('${especieId}', -1)">-</button>
                    <span id="contador-manual-${especieId}" class="contador-valor">0</span>
                    <button class="btn-contador" onclick="actualizarContador('${especieId}', 1)">+</button>
                </div>
            </div>
        `;
        contenedor.insertAdjacentHTML('beforeend', especieHTML);
    });
});


// Inicializar interfaz
function inicializarInterfaz() {
    const lista = document.getElementById('listaEspecies');
    lista.innerHTML = '';

    especies.forEach(especie => {
        const item = document.createElement('div');
        item.className = 'especie-item';
        item.innerHTML = `
            <span class="especie-nombre">${especie.nombre}</span>
            <div class="contador-wrapper">
                <button class="btn-esp" onclick="actualizarContador('${especie.id}', -1)">-</button>
                <span id="contador-${especie.id}" class="contador">0</span>
                <button class="btn-esp" onclick="actualizarContador('${especie.id}', 1)">+</button>
            </div>
        `;
        lista.appendChild(item);
    });
}

// Actualizar contador y publicar por MQTT
function actualizarContador(especieId, cambio) {
    const contador = document.getElementById(`contador-${especieId}`);
    let valor = parseInt(contador.textContent) || 0;
    
    valor += cambio;
    valor = Math.max(0, valor); // No permitir negativos
    contador.textContent = valor;

    // Publicar el nuevo valor por MQTT
    const especie = especies.find(e => e.id === especieId);
    if (especie) {
        client.publish(especie.topic, valor.toString());
        console.log(`Publicado: ${especie.topic} = ${valor}`);
    }
}

// Inicializar al cargar
window.onload = inicializarInterfaz;


//----------------------------------------------------------------------------------------
// #####--- FECHA Y HORA ---#####
// --- Función para mostrar la fecha y hora actual ---
function mostrarFechaHora() {
    const contenedor = document.getElementById('fechaHoraContenedor');
    const fechaActual = new Date();
    const fechaHoraFormateada = fechaActual.toLocaleString();
    contenedor.textContent = `Fecha y Hora Actual: ${fechaHoraFormateada}`;
}

mostrarFechaHora();
setInterval(mostrarFechaHora, 1000);


// ------------------------------------------------------------------------------------------------
// #####--- ABRIR Y CERRAR SESIÓN ---#####
// Recuperar el nombre de usuario desde localStorage
const usuarioLogeado = localStorage.getItem('loggedInUser');
if (usuarioLogeado) {
    document.getElementById('usuario').textContent = `Usuario: ${usuarioLogeado}`;
} else {
    document.getElementById('usuario').textContent = 'Usuario: No logeado';
    window.location.href = 'login.html'; // Redirigir a la página de login si no hay usuario logueado
}

// Función para cerrar sesión
function logout() {
    localStorage.removeItem('loggedInUser');
    window.location.href = '/logout';
}