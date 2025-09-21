## Data Synchronization

Si has estado desarrollando software por un tiempo, sin duda has escuchado esta famosa cita de Phil Karlton:

"Solo hay dos cosas difíciles en la Informática: la invalidación de la caché y nombrar cosas."

Fíjate que no es el caching lo que es difícil (después de todo, ya vimos lo simple que es guardar cosas dentro de un Map). En cambio, es la invalidación de esa caché lo que es la parte complicada.

Entonces, ¿cómo maneja exactamente React Query esta complejidad? Desde un alto nivel, simplemente intenta mantener los datos que vemos en nuestra pantalla (que es una representación del estado del servidor en el momento en que los datos fueron obtenidos) lo más actualizados posible.

Desafortunadamente, como sabes, el estado del servidor es algo vivo. Puede cambiar en cualquier momento y por muchas razones. Así que, en cierto modo, puedes pensar en React Query como una herramienta de sincronización de datos.

Como ejemplo, pensemos en una aplicación web de seguimiento de errores (Bug Tracking).

En este escenario, normalmente no eres el único desarrollador que registra o cierra problemas; es un entorno altamente colaborativo. Sin embargo, al mismo tiempo, es común que los usuarios de una aplicación web como esta mantengan su sesión del navegador abierta por largos períodos de tiempo.

Así que, si abriste la aplicación cuando empezaste a trabajar por la mañana y luego regresaste a ella después de unas horas de concentración, ¿cuáles son las probabilidades de que el estado en el cliente coincida con el estado en el servidor? Probablemente se acerquen a cero.

Para solucionar esto, necesitamos decidir cuándo los valores en la caché deben volverse inválidos, lo que significa que la caché debe volver a sincronizarse con el estado del servidor.

La configuración por defecto para la mayoría de las cachés es que la caché se invalide después de un cierto período de tiempo. Podemos ver esto en acción cada vez que usamos la API de GitHub, mirando el encabezado cache-control de las respuestas.


cache-control: public, max-age=60


Este encabezado le indica al navegador que no realice más peticiones a la misma URL en los próximos 60 segundos. En su lugar, servirá el recurso desde la caché del navegador.

El problema, como hemos visto, es que React Query no realiza la petición y, por lo tanto, no conoce el encabezado cache-control. Afortunadamente, React Query tiene un concepto similar que llama staleTime.

En términos de React Query, stale (obsoleto) es lo opuesto a fresh (fresco). Mientras una consulta sea considerada fresh, los datos solo se entregarán desde la caché. Y staleTime es lo que define el tiempo (en milisegundos) hasta que una consulta es considerada stale.

Así, por ejemplo, si establecemos nuestro staleTime en React Query a 60 segundos, obtendríamos un comportamiento similar en el que nuestra queryFn no se ejecutaría dentro de ese marco de tiempo.

Sabiendo eso, la siguiente pregunta que uno suele hacerse es cuál es el staleTime por defecto.

Lo creas o no, la respuesta es 0.

Sí, cero, como en cero milisegundos. Esto podría ser bastante sorprendente, porque significa que cada consulta es considerada stale al instante.

La documentación lo define como "valores por defecto agresivos pero sensatos".

Agresivos, porque significa que podríamos estar volviendo a obtener datos del servidor más a menudo de lo necesario, pero sensatos porque obtenerlos con demasiada frecuencia es el mal menor de las dos opciones.

Es un poco como los re-renders en React. Sí, todos queremos minimizar los re-renders de nuestra aplicación, pero tener demasiados es significativamente mejor que tener muy pocos, donde tu vista podría estar desincronizada con el estado de tu aplicación.

Además, si el valor por defecto no fuera 0, ¿cuál sería un mejor valor por defecto? ¿20 segundos? ¿30? ¿1 minuto? Es uno de esos casos en los que no puedes configurar un valor fiable para cada situación posible. La respuesta es siempre depende.

Específicamente, depende del recurso en cuestión: ¿Con qué frecuencia se actualiza? ¿Cuán precisos deben ser los datos mostrados en tu pantalla? ¿Cuán colaborativo es el entorno en el que estás trabajando?

La respuesta a estas preguntas debe ser decidida por los desarrolladores caso por caso.

Si obtenemos una publicación de Twitter (X 🫥) con todos sus likes y comentarios, es probable que se vuelva stale muy rápido. Por otro lado, si obtenemos tipos de cambio que se actualizan a diario, bueno, nuestros datos serán bastante precisos por un tiempo incluso sin volver a obtenerlos.

Así que, con todo esto en mente, React Query por defecto intenta mantener nuestros datos lo más actualizados posible, asumiendo que cualquier dato que obtenga está instantáneamente desactualizado. Por supuesto, si no estás de acuerdo con eso, el staleTime es fácilmente personalizable.


useQuery({
  queryKey: ['repos', { sort }],
  queryFn: () => fetchRepos(sort),
  staleTime: 5 * 1000 // 5,000 ms or 5 seconds
})


Al pasar un staleTime de 5000 a useQuery, le decimos a React Query que no considere la consulta stale (obsoleta) hasta que los datos tengan más de 5 segundos de antigüedad.

Naturalmente, esto nos lleva a otra pregunta: ¿qué sucede cuando una consulta se vuelve stale?

La respuesta, de nuevo, puede ser bastante sorprendente: nada.

Todo lo que hace una consulta stale es instruir a React Query para que actualice la caché en segundo plano cuando sea apropiado.

Podemos ver esto en acción al observar las diferencias entre estos dos gráficos: el primero muestra lo que sucede cuando isStale es false, y el segundo, cuando es true.

En ambos gráficos, los datos se entregan directamente desde la caché. Sin embargo, en el segundo, donde la consulta está stale (obsoleta), después de entregar los datos, React Query se resincroniza en segundo plano y actualiza la caché.

React Query no inventó esta estrategia de caching; es conocida como Stale While Revalidate (Obsoleto mientras se Revalida), pero lo que la hace tan poderosa es que le permite a React Query optimizar la experiencia de usuario de la aplicación al actualizar la interfaz de forma instantánea, mientras mantiene los datos actualizados en segundo plano.

El principio es que los datos obsoletos (stale) son mejores que ningún dato.

Esto nos lleva a una última pregunta: ¿cómo sabe exactamente React Query cuándo volver a obtener los datos y actualizar la caché? Antes mencioné que lo hace "cuando es apropiado", pero eso no es de mucha ayuda.

Hay cuatro escenarios (o "disparadores") en los que esto sucede, y ya has visto el primero.

- La queryKey cambia:
Este es el disparador que vimos en el ejemplo de arriba cuando el sort cambia. Si una queryKey cambia y la consulta está stale (obsoleta), React Query volverá a obtener los datos y actualizará la caché.

- Un nuevo observer se monta:
Los observers son creados por useQuery, por lo que cada vez que un nuevo componente se monta en la pantalla (como cuando un usuario abre un diálogo o navega a una pantalla diferente en nuestra SPA), si la consulta está stale, React Query volverá a obtener los datos y actualizará la caché.

- La ventana recibe un evento de focus:
Este es uno de los disparadores que ayuda a React Query a proporcionar una buena experiencia de usuario de forma predeterminada. Cada vez que un usuario regresa a la pestaña donde se está ejecutando nuestra aplicación, si la consulta está stale, React Query volverá a obtener los datos y actualizará la caché.

 El dispositivo se conecta a internet:
Este es otro ejemplo de cómo React Query ofrece una experiencia de usuario excepcional de forma predeterminada. Si un dispositivo se desconecta y luego se reconecta a internet (👋 hola, usuarios del metro), si la consulta está stale, React Query volverá a obtener los datos y actualizará la caché.


Personalizando los Disparadores

Por supuesto, si crees que eres más inteligente que los valores por defecto, eres más que bienvenido a desactivarlos cuando creas tu consulta.


useQuery({
  queryKey: ['repos', { sort }],
  queryFn: () => fetchRepos(sort),
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
})


Sin embargo, si solo quieres ser más conservador con tus refetches (nuevas obtenciones), la mejor opción es simplemente aumentar tu staleTime.

Y si estás realmente preocupado (y seguro de que los datos nunca cambiarán), puedes incluso hacer que los datos en caché se mantengan frescos para siempre, estableciendo staleTime en Infinity.


useQuery({
  queryKey: ['repos', { sort }],
  queryFn: () => fetchRepos(sort),
  staleTime: Infinity
})


Simplemente recuerda que lo que sea que suceda en términos de refetching (volver a obtener los datos) no influye en absoluto en cómo se entregan los datos desde la caché. React Query siempre entregará los datos desde la caché si existen, incluso si esos datos ya no están frescos.

staleTime solo le dice a React Query cuándo debe actualizar la caché en segundo plano cuando ocurre un disparador.

Y dado que podría ser el concepto más importante de React Query a entender, aquí tienes un resumen rápido:

React Query siempre nos dará los datos en caché al instante, incluso si no están frescos.

Por defecto, todas las consultas se consideran obsoletas al instante, ya que staleTime tiene un valor predeterminado de 0.

Si una consulta está obsoleta, React Query volverá a obtener los datos y actualizará la caché cuando ocurra un disparador.

Puedes desactivar cualquier disparador, pero a menudo es mejor pensar en cuánto tiempo un recurso debe ser considerado fresco y configurar eso como staleTime.