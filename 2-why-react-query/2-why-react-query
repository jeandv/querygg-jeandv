Aunque parezca increíble, ese problema es React. Para entender por qué, tenemos que volver a lo básico.

En su forma más fundamental, React es una biblioteca para crear interfaces de usuario. Es tan simple que, históricamente, todo el modelo mental se ha representado a menudo como una fórmula en la que la vista es simplemente una función del estado de la aplicación.

Lo único que tienes que hacer es preocuparte por cómo cambia el estado en tu aplicación, y React se encargará del resto.

El modo principal de encapsulación para este concepto es el componente, que encapsula tanto la representación visual de una parte concreta de la interfaz de usuario como el estado y la lógica que la acompañan.

Al hacerlo, la misma intuición que tienes sobre la creación y composición conjunta de funciones se puede aplicar directamente a la creación y composición de componentes. Sin embargo, en lugar de componer funciones conjuntamente para obtener algún valor, puedes componer componentes conjuntamente para obtener alguna interfaz de usuario.

De hecho, cuando piensas en la composición en React, lo más probable es que pienses en términos de esta composición de la interfaz de usuario, ya que es en lo que React destaca.

El problema es que, en el mundo real, crear una aplicación implica mucho más que la capa de la interfaz de usuario. No es raro tener que componer y reutilizar también lógica no visual.

Este es el problema fundamental que los hooks de React fueron creados para resolver.

Al igual que un componente permitió la composición y reutilización de la interfaz de usuario, los hooks permitieron la composición y reutilización de la lógica no visual.


useState
crea un valor que se conserva entre renderizaciones y activa una nueva renderización cuando cambia

useEffect
sincroniza un componente con algún sistema externo

useRef
crea un valor que se conserva entre renderizaciones, pero no activa una nueva renderización cuando cambia

useContext
obtiene acceso a lo que se pasó al proveedor de un contexto

useReducer
crea un valor que se conserva entre renderizaciones y activa una nueva renderización cuando cambia, utilizando el patrón reductor

useMemo
almacena en caché el resultado de un cálculo entre renderizaciones

useCallback
almacena en caché una función entre renderizaciones

useLayoutEffect
sincronizar un componente con algún sistema externo, "antes" de que el navegador pinte la pantalla

useAnything
parte de lo que hace que los hooks sean tan componibles es que puedes crear tus propios hooks que aprovechan los hooks de React u otros hooks personalizados


El lanzamiento de los hooks marcó el comienzo de una nueva era para React, a la que me gusta llamar «¿Cómo demonios recuperamos los datos?».

Lo interesante de todos los hooks integrados que incluye React, como probablemente habrás comprobado de primera mano, es que ninguno de ellos está dedicado al que posiblemente sea el caso de uso más común para crear una aplicación web en el mundo real: la recuperación de datos.

Lo más parecido que podemos conseguir con React es recuperar datos dentro de useEffect y luego conservar la respuesta con useState.

** Sin duda, habrás visto algo así antes. (VER: ejemplo-1)

--

Estamos obteniendo algunos datos de PokéAPI y mostrándolos en la vista, lo cual es bastante sencillo.


El problema es que se trata de un código «tutorial» y, lamentablemente, no se puede escribir código «tutorial» en el trabajo.


El primer problema, como habrás notado si has probado la aplicación, es que no estamos gestionando ningún estado de carga. Esto conduce a uno de los dos pecados más graves de la experiencia de usuario: el cambio de diseño acumulativo.


Hay varias formas de resolverlo, la más sencilla es mostrar una tarjeta vacía cuando la solicitud está en curso.


Para ello, añadamos más estado, establezcámoslo en verdadero por defecto y luego en falso una vez que la solicitud se haya completado. A continuación, utilizaremos ese estado de carga para determinar si debemos mostrar el Pokémon o no.


** VER: ejemplo-2

Mejor, pero por desgracia sigue siendo código «tutorial».


Tal y como está, dado que no estamos gestionando las solicitudes fallidas a la PokéAPI, existe la posibilidad de que nuestra aplicación cometa el segundo de los pecados más graves en materia de experiencia de usuario: la pantalla de carga infinita.


Intentémoslo de nuevo añadiendo algún estado de error.

** VER ejemplo-3



Mucho mejor. Ahora nuestra aplicación gestiona los tres estados más comunes de una solicitud de red: carga, éxito y error.


Como le hemos indicado a useEffect que sincronice nuestro estado local de pokémon con la PokéAPI según el id, hemos tomado lo que históricamente ha sido la parte más compleja de la creación de una aplicación web, un efecto secundario asíncrono, y lo hemos convertido en un detalle de implementación detrás de la simple actualización del id.


Por desgracia, aún no hemos terminado. De hecho, tal y como está, nuestro código contiene el peor tipo de error: uno que pasa desapercibido y que es engañosamente ineficiente. ¿Puedes detectarlo?


Si no es así,
aquí tienes una pista.


Cada vez que llamamos a fetch, al tratarse de una solicitud asíncrona, no tenemos ni idea de cuánto tiempo tardará en resolverse esa solicitud específica. Es muy posible que, mientras estamos esperando una respuesta, el usuario haga clic en uno de nuestros botones, lo que provoca un nuevo renderizado, lo que a su vez hace que nuestro efecto se ejecute de nuevo con un id diferente.


En este escenario, ahora tenemos dos solicitudes en curso, ambas con identificadores diferentes. Peor aún, no tenemos forma de saber cuál se resolverá primero. En ambos escenarios, llamamos a setPokemon cuando se resuelve la solicitud. Eso significa que, como no sabemos en qué orden se resolverán, pokemon y, por lo tanto, nuestra interfaz de usuario, acabarán siendo lo que sea que se haya resuelto en último lugar. Es decir, tenemos una condición de carrera.


Para empeorar las cosas, también verás un destello del Pokémon que se resuelve primero, antes de que lo haga el segundo.


Puedes verlo en acción jugando con la aplicación. Cambia el Pokémon activo tan rápido como puedas y observa lo que sucede (es aún más evidente si reduces la velocidad de tu red).

Es una experiencia bastante mediocre. ¿Cómo lo solucionarías? Profundizando en el laberinto de useEffect.


Lo que realmente queremos hacer es decirle a React que ignore cualquier respuesta que provenga de solicitudes realizadas en efectos que ya no son relevantes. Para ello, por supuesto, necesitamos una forma de saber si un efecto es el más reciente. Si no es así, debemos ignorar la respuesta y no establecer Pokemon dentro de ella.


Lo ideal sería algo como esto.

try {
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)

  if (ignore) {
    return
  }

  if (res.ok === false) {
    throw new Error(`Error fetching pokemon #${id}`)
  }

  const json = await res.json()

  setPokemon(json)
  setLoading(false)
} catch (e) {
  setError(e.message)
  setLoading(false)
}


Para ello, podemos utilizar la función de limpieza de useEffect.


Si devuelves una función desde tu efecto, React llamará a esa función cada vez antes de volver a llamar a tu efecto, y luego una última vez cuando el componente se elimine del DOM.

import * as React from "react"

export default function App () {
  const [count, setCount] = React.useState(0)

  React.useEffect(() => {
    console.log(`In effect: ${count}`)
    return () => {
      console.log(`In cleanup: ${count}`)
    }
  }, [count])

  const handleClick = () => setCount(count + 1)

  if (count > 3) {
    return null
  }

  return (
    <button onClick={handleClick}>
      {count}
    </button>
  )
}

Podemos ver esto en acción añadiendo una función de limpieza a nuestro efecto que registra el identificador asociado al efecto.

** VER ejemplo-4



Ahora juega con la aplicación y fíjate en los registros. En concreto, piensa en cómo podemos aprovechar este conocimiento de nuestra función de limpieza para ignorar las respuestas obsoletas.


Ten en cuenta que la función de limpieza solo se llama para los identificadores que ya no son relevantes. Esto tiene sentido porque la función de limpieza para el efecto más reciente no se llamará hasta que se ejecute otro efecto (lo que lo hará obsoleto) o hasta que el componente se haya eliminado del DOM (irrelevante en este escenario).

** VER ejemplo-5


Ahora, independientemente de cuántas veces cambie el id, ignoraremos todas las respuestas que no estén en el efecto más reciente. Esto no solo hace que nuestra aplicación sea más
eficiente,
sino que también mejora la experiencia del usuario, ya que React ahora solo volverá a renderizar con el último Pokémon.


Así que, llegados a este punto, ya hemos terminado, ¿verdad?


Si hicieras un PR con este código en el trabajo, lo más probable es que alguien te pidiera que abstrajeras toda la lógica para gestionar la solicitud de recuperación en un hook personalizado. Si lo hicieras, tendrías dos opciones. O bien crear un hook usePokemon, o bien crear un hook useQuery más genérico que pudiera utilizarse para cualquier tipo de solicitud de red.


Suponiendo que optaras por lo segundo, probablemente se vería algo así.


** VER ejemplo-6



Todavía recuerdo lo orgulloso que me sentí cuando creé esta abstracción por primera vez. Sin duda, un hook personalizado como este supondría un gran cambio a la hora de realizar solicitudes de red en una aplicación React.


Eso fue hasta que empecé a utilizarlo.


Tal y como está, nuestro hook personalizado no aborda otro problema fundamental del uso del estado y los efectos para la obtención de datos: la duplicación de datos.


Por defecto, los datos obtenidos solo son locales para el componente que los ha obtenido, así es como funciona React. Eso significa que, para cada componente que necesite los mismos datos, tenemos que volver a obtenerlos.


Puede parecer algo sin importancia, pero no lo es.


Cada componente tendrá su propia instancia del estado y cada componente tendrá que mostrar un indicador de carga al usuario mientras lo obtiene.


Peor aún, es posible que, al recuperar datos del mismo punto final, una solicitud falle mientras que la otra tenga éxito. O bien, una recuperación podría dar lugar a datos diferentes a los de una solicitud posterior. Imagina recuperar dos veces datos de la API de GitHub, recibir primero que hay un problema abierto y, poco después, que se ha cerrado porque se ha solucionado.


Toda la previsibilidad que ofrece React se ha esfumado.


Puede parecer injustificado, pero este es el tipo de problemas con los que te encontrarás cuando recuperes datos asíncronos en una aplicación del mundo real. Para empeorar las cosas, también son el tipo de problemas en los que muy poca gente piensa.


Ahora bien, si eres un desarrollador experimentado de React, quizá pienses que, si el problema es que estamos obteniendo los mismos datos varias veces, ¿no podríamos simplemente mover ese estado al componente padre más cercano y pasarlo a través de props?


¿O mejor aún, poner los datos obtenidos en contexto para que estén disponibles para cualquier componente que los necesite?

Sure, and if we did that, we'd probably end up with something like this.

** VER ejemplo-7


Bueno, funciona, pero este es exactamente el tipo de código por el que tu yo futuro odiará a tu yo actual.


El mayor cambio (además de todo el lío del contexto) es que, dado que nuestro estado ahora es «global», debe ser capaz de almacenar datos, cargas y estados de error para múltiples URL. Para lograrlo, tuvimos que convertir nuestro estado en un objeto en el que la propia URL es la clave.


Ahora, cada vez que llamemos a useQuery con una URL, leeremos el estado existente si existe, o lo obtendremos si no existe.

useQuery('/api/rankings') // fetches
useQuery('/api/rankings') // from cache


Con eso, acabamos de introducir una pequeña caché en memoria

y se ha restablecido la previsibilidad.


Por desgracia, hemos cambiado nuestro problema de previsibilidad por un problema de optimización.


Como sabrás, React Context no es una herramienta especialmente buena para distribuir datos dinámicos por toda una aplicación, ya que carece de una característica fundamental de los gestores de estado: la capacidad de suscribirse a partes de tu estado.


Tal y como está, cualquier componente que llame a useQuery se suscribirá a todo el QueryContext y, por lo tanto, se volverá a renderizar cada vez que cambie algo, incluso si el cambio no está relacionado con la URL que le interesa.


Además, si dos componentes llaman a useQuery con la misma URL al mismo tiempo, a menos que podamos averiguar cómo deduplicar varias solicitudes, nuestra aplicación seguirá realizando dos solicitudes, ya que useEffect sigue llamándose una vez por componente.


Ah, y como hemos introducido una caché, también tenemos que introducir una forma de invalidarla, y como sabrás,
la invalidación de la caché es difícil.



Lo que comenzó como un patrón sencillo e inocente para recuperar datos en una aplicación React se ha convertido en un ataúd de complejidad y, por desgracia, no hay un único culpable.


useEffect es confuso.


El contexto a menudo se vuelve confuso con el tiempo.


Combinar useState, useEffect y Context en un intento por «gestionar» el estado provocará dolor y sufrimiento.


Estamos tratando el estado asíncrono como si fuera un estado síncrono.

En este punto, los puntos 1 a 3 deberían ser obvios, así que pasemos al punto 4.


El estado sincrónico es el estado al que estamos acostumbrados cuando trabajamos en el navegador. Es nuestro estado, por lo que a menudo se denomina estado del cliente. Podemos confiar en que estará disponible al instante cuando lo necesitemos y nadie más puede manipularlo, por lo que siempre está actualizado.

CLIENT STATE:

1. Propiedad del cliente: siempre está actualizado.
2. Nuestro estado: solo nosotros podemos cambiarlo.
3. Normalmente efímero: desaparece cuando se cierra el navegador.
4. Sincrónico: está disponible al instante.


Todas estas características hacen que sea fácil trabajar con el estado del cliente, ya que es predecible. No hay mucho que pueda salir mal si somos los únicos que podemos actualizarlo.


El estado asíncrono, por otro lado, es un estado que no nos pertenece. Tenemos que obtenerlo de otro lugar, normalmente un servidor, por lo que a menudo se denomina estado del servidor.


Persiste, normalmente en una base de datos, lo que significa que no está
disponible al instante. --> "Por eso es por lo que a menudo lo necesitamos."
Esto hace que su gestión, especialmente a lo largo del tiempo, sea complicada.


SERVER STATE:

1. Propiedad del servidor: lo que vemos es solo una instantánea (que puede estar desactualizada).
2. Propiedad de muchos usuarios: varios usuarios pueden modificar los datos.
3. Persistencia remota: existe entre sesiones de navegación.
4. Asíncrono: los datos tardan un poco en pasar del servidor al cliente.


Aunque es muy habitual, resulta problemático tratar estos dos tipos de estados como si fueran iguales.


Para gestionar el estado del cliente en una aplicación React, disponemos de muchas opciones, desde los hooks integrados como useState y useReducer, hasta soluciones mantenidas por la comunidad como redux o zustand.


Pero, ¿qué opciones tenemos para gestionar el estado del servidor en una aplicación React?


Históricamente, no había muchas. Es decir, hasta que apareció React Query.


Irónicamente, es posible que hayas oído que React Query es «la pieza que faltaba para la obtención de datos en React».


Nada más lejos de la realidad. De hecho...

React Query is not a data fetching library

¡Y eso es bueno! Porque a estas alturas debería quedar claro que la obtención de datos en sí misma no es lo difícil, sino gestionar esos datos a lo largo del tiempo.


Y aunque React Query funciona muy bien con la obtención de datos, una mejor forma de describirlo es como un gestor de estado asíncrono que también es muy consciente de las necesidades del estado del servidor.


De hecho, React Query ni siquiera obtiene datos por ti. TÚ le proporcionas una promesa (ya sea de fetch, axios, graphql, IndexedDB, etc.), y React Query toma los datos que resuelve la promesa y los pone a tu disposición dondequiera que los necesites en toda tu aplicación.

** VER ejemplo-8 "ver uso de react query"


A partir de ahí, puede encargarse de todo el trabajo sucio del que usted no es consciente o en el que no debería pensar.


1. Cache management (Gestión de la caché.)
2. Invalidación de la caché.
3. Auto refetching (Recuperación automática)
4. Scroll recovery
5. Offline support (Compatibilidad sin conexión.)
6. Window focus refetching - (Recuperación del foco de la ventana.)
7. Dependent queries - Consultas dependientes.
8. pages queries - Consultas paginadas.
9.  Request cancellation - Cancelación de solicitudes
10. Prefetching - Precarga
11. Polling - Sondeo
12. Mutaciones
13. Scroll infinito
14. Data selectors - Selectores de datos
15. + Más
¿Y lo mejor de todo? Puedes dejar de intentar averiguar cómo funciona useEffect, que es por lo que resuelve la regla de las 5 en punto.
