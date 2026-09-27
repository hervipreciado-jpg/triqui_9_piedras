document.addEventListener('DOMContentLoaded', () => {
    const menuItems = document.querySelectorAll('#menu li');
    const sections = document.querySelectorAll('.content-section');
    const pageTitle = document.getElementById('page-title');
    const btnAtras = document.getElementById('btn-atras');
    const btnInicio = document.getElementById('btn-inicio');
    const SECCION_INICIO = 'perfil';

    // Lee la sección de la URL (#/juegos o #juegos). Se usa "#/" para que el navegador no salte al elemento con ese id
    function seccionDelHash() {
        return location.hash.replace(/^#\/?/, '');
    }

    // Muestra una sección y marca su elemento del menú como activo
    function mostrarSeccion(sectionId) {
        const activeSection = document.getElementById(sectionId);
        if (!activeSection || !activeSection.classList.contains('content-section')) return;

        sections.forEach(section => {
            section.classList.remove('active');
            section.style.display = 'none';
        });
        activeSection.classList.add('active');
        activeSection.style.display = 'block';

        menuItems.forEach(li => {
            const activo = li.getAttribute('data-section') === sectionId;
            li.classList.toggle('active', activo);
            if (activo && pageTitle) {
                pageTitle.textContent = li.textContent.trim();
            }
        });

        window.scrollTo(0, 0);
    }

    // Activa el botón "Atrás" solo cuando hay una sección anterior a la que volver
    function actualizarBotonAtras() {
        const profundidad = (history.state && history.state.profundidad) || 0;
        if (btnAtras) btnAtras.disabled = profundidad === 0;
    }

    // Navega a una sección guardándola en el historial (así funciona también el botón atrás del móvil)
    function navegarA(sectionId) {
        const actual = history.state && history.state.seccion;
        if (actual === sectionId) return;
        const profundidad = ((history.state && history.state.profundidad) || 0) + 1;
        history.pushState({ seccion: sectionId, profundidad }, '', '#/' + sectionId);
        mostrarSeccion(sectionId);
        actualizarBotonAtras();
    }

    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navegarA(item.getAttribute('data-section'));
        });
    });

    if (btnInicio) {
        btnInicio.addEventListener('click', () => navegarA(SECCION_INICIO));
    }

    if (btnAtras) {
        btnAtras.addEventListener('click', () => history.back());
    }

    window.addEventListener('popstate', (e) => {
        const seccion = (e.state && e.state.seccion) || seccionDelHash() || SECCION_INICIO;
        mostrarSeccion(seccion);
        actualizarBotonAtras();
    });

    // Inicializar con la sección del enlace (#juegos, etc.) o la sección de inicio (Perfil)
    const inicial = (history.state && history.state.seccion) || seccionDelHash() || SECCION_INICIO;
    if (!history.state) {
        history.replaceState({ seccion: inicial, profundidad: 0 }, '', '#/' + inicial);
    }
    mostrarSeccion(document.getElementById(inicial) ? inicial : SECCION_INICIO);
    actualizarBotonAtras();
});
