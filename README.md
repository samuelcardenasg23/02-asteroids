# Asteroids

Clon del clásico arcade **Asteroids** implementado en canvas HTML5 puro, sin dependencias ni bundler.

## Demo:

[Asteroids demo](https://klerith.github.io/claude-asteroids/)

## Descripción del juego

Nave espacial en un campo de asteroides con envolvimiento de bordes (el espacio es toroidal). Destruye asteroides para sumar puntos: los grandes se parten en medianos, los medianos en pequeños. Incluye 5 power-ups especiales (ver más abajo) y, próximamente, tipos de asteroides únicos como la estrella fugaz...

## Tecnologías

- **HTML5 Canvas** — renderizado 2D
- **JavaScript (ES6+)** — lógica del juego en un solo archivo `game.js`
- Sin frameworks, sin bundler, sin dependencias

## Cómo correr

Abre `index.html` directamente en el navegador (doble clic), o usa un servidor local:

```bash
npx serve .
```

Luego visita `http://localhost:3000`.

## Controles

| Tecla     | Acción     |
| --------- | ---------- |
| `←` `→`   | Rotar nave |
| `↑`       | Propulsar  |
| `Espacio` | Disparar   |
| `B`       | Bomba Nova |

## Puntuación

| Asteroide | Puntos |
| --------- | ------ |
| Grande    | 20     |
| Mediano   | 50     |
| Pequeño   | 100    |

## Power-ups

Al destruir un asteroide hay un 10 % de probabilidad de que suelte un ítem (máx. 2 en pantalla a la vez). Flota unos 8 s, parpadea antes de desaparecer y se recoge tocándolo con la nave. Volver a recoger uno activo reinicia su temporizador. Al perder una vida se pierden los efectos temporales, pero la Bomba Nova guardada se conserva.

| Ítem                  | Figura    | Efecto                                                                  | Duración |
| --------------------- | --------- | ----------------------------------------------------------------------- | -------- |
| **Escudo**            | Hexágono  | Absorbe un impacto de asteroide (y lo destruye)                         | 5 s      |
| **Disparo triple**    | Triángulo | 3 balas en abanico por disparo                                          | 10 s     |
| **Slow motion**       | Rombo     | Los asteroides van a la mitad de velocidad                              | 6 s      |
| **Bomba Nova**        | Estrella  | Destruye todos los asteroides; se guarda (máx. 1) y se activa con `B`   | 1 uso    |
| **Hiperpropulsión**   | Cuadrado  | Más empuje, giro y velocidad máxima                                     | 8 s      |

Los efectos activos se muestran como barras abajo a la izquierda; la Nova guardada aparece abajo a la derecha como `NOVA [B]`.

## Características

- 3 vidas con invencibilidad temporal al reaparecer (parpadeo)
- Asteroides se parten en fragmentos más pequeños al ser destruidos
- Partículas de explosión al destruir asteroides
