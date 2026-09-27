# He Dreamer — Portafolio + Triqui 9 Piedras

Portafolio web de **Segundo Hermes Landazuri Preciado** con el juego **Triqui de 9 Piedras** (Molino con diagonales) integrado, y su versión como app Android.

## Estructura

| Carpeta / archivo | Contenido |
|---|---|
| `index.html`, `css/`, `js/`, `img/`, `cursos/` | Portafolio web |
| `TRIQUI9_PIEDRAS/triqui_game/` | Juego Triqui 9 Piedras (PWA: 1 o 2 jugadores, sonidos, reglas) |
| `server.js` | Servidor local para probar la web |
| `app-movil/` | App Android hecha con Capacitor |

## Ver la web en local

```bash
node server.js
```
Luego abre http://localhost:8000

## Compilar la APK de Android

Requisitos: Node.js, JDK 21 y Android SDK (rutas configuradas en `app-movil/build-apk.bat`).

```bash
cd app-movil
npm install
build-apk.bat
```
La APK queda en `app-movil/HeDreamer.apk`. El script copia la web a la app, sincroniza Capacitor y compila con Gradle.
