## Offline Support

No importa cuántas veces lo haya hecho, siempre hay algo un poco mágico en la obtención de datos a través de la red. Es un sutil recordatorio de que la web es simplemente una red de computadoras, y que los humanos encontraron una manera de hacer que hablen. 🌐

Por supuesto, como la mayoría de las cosas que tocan los humanos, esta comunicación no siempre es perfecta. A veces, la conexión de red es rápida, a veces es lenta y a veces no existe en absoluto.

Para empeorar las cosas, con la API fetch, si intentaras obtener datos mientras estás offline (sin conexión), obtendrías un error de red bastante vago como este:


Uncaught TypeError: Failed to fetch


Y peor aún, por defecto, la API fetch no reintentará la solicitud cuando el dispositivo vuelva a estar online (conectado).

Aunque React Query no es una librería de obtención de datos, sí alivia muchos de los puntos problemáticos comunes relacionados con la obtención de datos, incluyendo el soporte offline.

En el escenario de un dispositivo sin conexión, React Query marcará el fetchStatus de la query como paused (en pausa), sin siquiera intentar ejecutar la queryFn. Luego, si el dispositivo vuelve a estar online, React Query reanudará automáticamente la query de forma normal.

Podemos ver esto en acción con esta aplicación.

Cada vez que el dispositivo esté offline, mostraremos un indicador de offline 📶 en la esquina superior derecha de la interfaz de usuario.

Nota: Para simular más fácilmente estar offline, puedes alternar el ícono de Wifi dentro de las React Query Devtools. Además, para darte la posibilidad de alternar la configuración de tu red antes de que se cargue la aplicación, he puesto la carga de la aplicación detrás de un botón de alternancia.


import * as React from "react"
import { useQuery } from '@tanstack/react-query'
import { fetchRepos } from './api'
import { RiWifiOffLine } from "react-icons/ri"

function useRepos() {
  return useQuery({
    queryKey: ['repos'],
    queryFn: fetchRepos,
  })
}

function Offline() {
  return <RiWifiOffLine size={25} color="var(--red)"/>
}

function Repos() {
  const { data, status, fetchStatus } = useRepos()
  const offline = fetchStatus === "paused"

  if (status === 'pending') {
    return (
      <>
        <div>...</div>
        { offline && <Offline/> }
      </>
    )
  }

  if (status === 'error') {
    return <div>There was an error fetching the repos</div>
  }

  return (
    <>
      <ul>
        { data.map(repo => <li key={repo.id}>{repo.full_name}</li>) }
      </ul>
      { offline && <Offline/> }
    </>
  )
}

export default function App() {
  const [show, setShow] = React.useState(false)

  return (
    <div className="container">
      <button className="button" onClick={() => setShow(!show)}>
        {show ? 'Hide App' : 'Load App'}
      </button>
      { show ? <Repos /> : null }
    </div>
  )
}


Y si registraras la query después de desconectarte, verías esto:


{
  "status": "pending",
  "data": undefined,
  "fetchStatus": "paused"
}


Como sabes, el status nos da información sobre los datos en la caché para la queryKey, y el fetchStatus nos da información sobre la queryFn.

Debido a que el status es pending, sabemos que no hay datos en la caché.

Y debido a que el fetchStatus es paused, también sabemos que el dispositivo está offline y React Query no intentó ejecutar la queryFn.

Esta es otra razón por la cual debes usar isPending para mostrar u ocultar un indicador de carga en lugar de isLoading. Recuerda que isLoading se deriva de las propiedades status y fetchStatus:


const isLoading = status === 'pending' && fetchStatus === 'fetching'


En el escenario en el que un dispositivo se desconecta, fetchStatus será paused y, por lo tanto, isLoading será false, aunque no tengamos ningún dato.

Ahora, aquí tienes una pregunta para ti. ¿Cómo crees que se comporta nuestra aplicación si nos desconectamos después de que los datos ya se hayan obtenido y añadido a la caché?

Pruébalo por ti mismo.


import * as React from "react"
import { useQuery } from '@tanstack/react-query'
import { fetchRepos } from './api'
import { RiWifiOffLine } from "react-icons/ri"

function useRepos() {
  return useQuery({
    queryKey: ['repos'],
    queryFn: fetchRepos,
  })
}

function Offline() {
  return <RiWifiOffLine size={25} color="var(--red)"/>
}

function Repos() {
  const { data, status, fetchStatus } = useRepos()
  const offline = fetchStatus === "paused"

  if (status === 'pending') {
    return (
      <>
        <div>...</div>
        { offline && <Offline/> }
      </>
    )
  }

  if (status === 'error') {
    return <div>There was an error fetching the repos</div>
  }

  return (
    <>
      <ul>
        { data.map(repo => <li key={repo.id}>{repo.full_name}</li>) }
      </ul>
      { offline && <Offline/> }
    </>
  )
}

export default function App() {
  const [show, setShow] = React.useState(true)

  return (
    <div className="container">
      <button className="button" onClick={() => setShow(!show)}>
        {show ? 'Hide App' : 'Load App'}
      </button>
      { show ? <Repos /> : null }
    </div>
  )
}


Como probablemente adivinaste, desconectarse no vacía la caché.

Esto significa que si un dispositivo se desconecta después de que los datos ya se han obtenido y añadido a la caché, el usuario aún podrá ver los datos que se obtuvieron antes de que se desconectaran. Luego, si el dispositivo recupera la conectividad, React Query intentará automáticamente volver a obtener los datos y actualizar la caché.

Ahora, como siempre con React Query, hay formas de personalizar cómo se comporta cuando un dispositivo se desconecta, y puedes hacerlo mediante su opción networkMode.

El valor predeterminado de networkMode es online, que, como has visto, le indica a React Query que "pause" la query y no intente ejecutar la queryFn.

Este es un valor predeterminado razonable, pero no funciona en todos los escenarios.

Por ejemplo, ¿qué pasa si tuviéramos una query que no necesita conexión de red para funcionar? Considera esta simple query de una de las primeras lecciones del curso:


const { data } = useQuery({
  queryKey: ['luckyNumber'],
  queryFn: () => Promise.resolve(7),
})


No hay razón para pausar una query como esta solo porque el dispositivo esté offline.

En estos escenarios, puedes establecer networkMode en always (siempre), lo que le indicará a React Query que siempre ejecute la queryFn, independientemente del estado de la red.

Cuando haces esto, refetchOnReconnect se establecerá automáticamente en false, ya que recuperar la conexión de red ya no es un buen indicador de que las queries obsoletas deban ser re-obtenidas.

Otra opción es establecer networkMode en offlineFirst (primero sin conexión). En este modo, la primera solicitud siempre se dispara, y luego los posibles reintentos se pausan si la solicitud inicial falló debido a la falta de conexión de red.

¿Cuándo sería una buena opción este modo? Cada vez que tengas una capa de caché adicional entre tu API y React Query. Un buen ejemplo de esto es la propia caché del navegador.

Si echamos un vistazo a una solicitud realizada a la API de GitHub en las herramientas de desarrollo de nuestro navegador, podemos ver que responde con el siguiente Encabezado de Respuesta:


cache-control: public, max-age=60, s-maxage=60


Este encabezado indicará al navegador que almacene la respuesta en caché durante 60 segundos, lo que significa que cada solicitud posterior que haga React Query dentro de ese período de tiempo no llegará realmente a la API de GitHub, sino que se servirá desde la caché del navegador.


Leer desde la caché del navegador no solo es extremadamente rápido, ¡sino que también funciona mientras estamos offline! Sin embargo, con el networkMode predeterminado de React Query, que es online, debido a que todas las solicitudes se pausan cuando el dispositivo está sin conexión, no podemos aprovecharlo.

Aquí es donde configurar el networkMode a offlineFirst (primero sin conexión) puede ayudarnos.

Con offlineFirst:

Si se ha realizado una solicitud y se ha almacenado en la caché del navegador antes de que el dispositivo se desconecte, React Query seguirá invocando la queryFn.

Esta queryFn llamará a fetch, obteniendo los datos de la caché del navegador y devolviéndolos a React Query.

Si no hay datos en la caché del navegador, React Query pausará la query y esperará hasta que el dispositivo recupere la conectividad para intentarlo de nuevo.

Podemos ver esto en acción con la siguiente aplicación.

Después de que la aplicación cargue, abre las herramientas de desarrollo del navegador, ve a la pestaña Network (Red) y establece tu red en Offline (Sin conexión). Desde allí, selecciona la query [repos] en las Devtools de Query y luego haz clic en Reset (Restablecer).


import * as React from "react"
import { useQuery } from '@tanstack/react-query'
import { fetchRepos } from './api'
import { RiWifiOffLine } from "react-icons/ri"

function useRepos() {
  return useQuery({
    queryKey: ['repos'],
    queryFn: fetchRepos,
    networkMode: "offlineFirst"
  })
}

function Offline() {
  return <RiWifiOffLine size={25} color="var(--red)"/>
}

function Repos() {
  const { data, status, fetchStatus } = useRepos()
  const offline = fetchStatus === "paused"

  if (status === 'pending') {
    return (
      <>
        <div>...</div>
        { offline && <Offline/> }
      </>
    )
  }

  if (status === 'error') {
    return <div>There was an error fetching the repos</div>
  }

  return (
    <>
      <ul>
        { data.map(repo => <li key={repo.id}>{repo.full_name}</li>) }
      </ul>
      { offline && <Offline/> }
    </>
  )
}

export default function App() {
  return (
    <div className="container">
      <Repos />
    </div>
  )
}


Lo que verás es que durante 60 segundos, cada vez que haces clic en Reset (Restablecer), la queryFn se ejecutará, obteniendo los datos de la caché de disco del navegador y devolviéndolos a React Query. Después de 60 segundos, si haces clic en Reset, la caché del navegador habrá expirado y la queryFn se pausará, esperando que el dispositivo recupere la conectividad para volver a ejecutarse.

🚨 ¡No Desactives la Caché del Navegador!
Si no estás viendo el comportamiento descrito anteriormente, es probable que hayas deshabilitado la caché de tu navegador.

Para cambiarlo, vuelve a la pestaña Network (Red) en las herramientas de desarrollo de tu navegador y asegúrate de que la opción Disable cache (Deshabilitar caché) no esté marcada.

Ahora, lidiar con el soporte offline en lo que respecta a la obtención de datos no es terriblemente difícil, y el comportamiento predeterminado de React Query suele ser suficiente la mayor parte del tiempo. Sin embargo, las cosas se complican un poco más cuando empezamos a hablar de mutaciones.

Debido a que las mutaciones tienen efectos secundarios en el servidor, a diferencia de las queries, debemos ser un poco más deliberados con la forma en que las manejamos cuando el dispositivo se vuelve a conectar.

Afortunadamente, la estrategia predeterminada de React Query para este escenario realiza gran parte del trabajo pesado por nosotros.

Cuando ocurren mutaciones mientras un dispositivo está offline, React Query las rastreará en una cola (queue). Luego, una vez que el dispositivo vuelve a estar online, descargará la cola de mutaciones en el orden exacto en que ocurrieron, y en paralelo.

Podemos ver esto en acción echando otro vistazo a la aplicación que construimos en la lección de Actualizaciones Optimistas (Optimistic Updates).


import * as React from 'react'
import { 
  useQuery, 
  useMutation, 
  useQueryClient 
} from '@tanstack/react-query'
import { fetchTodos, addTodo, toggleTodo } from './api'

function useToggleTodo(id, sort) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => toggleTodo(id),
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: ['todos', 'list', { sort }]
      })

      const snapshot = queryClient.getQueryData(
        ['todos', 'list', { sort }]
      )

      queryClient.setQueryData(
        ['todos', 'list', { sort }],
        (previousTodos) => previousTodos?.map((todo) =>
          todo.id === id ? { ...todo, done: !todo.done } : todo
        )
      )

      return () => {
        queryClient.setQueryData(
          ['todos', 'list', { sort }],
          snapshot
        )
      }
    },
    onError: (error, variables, rollback) => {
      console.log('error', error)
      rollback?.()
    },
    onSettled: () => {
      return queryClient.invalidateQueries({
        queryKey: ['todos', 'list']
      })
    }
  })
}

function useTodos(sort) {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: ['todos', 'list', { sort }],
    queryFn: () => fetchTodos(sort),
    placeholderData: queryClient.getQueryData(['todos', 'list', { sort }]),
    staleTime: 10 * 1000
  })
}

function useAddTodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addTodo,
    onSuccess: () => {
      return queryClient.invalidateQueries({
        queryKey: ['todos', 'list']
      })
    }
  })
}

function Todo({ todo, sort }) {
  const { mutate, isPending } = useToggleTodo(todo.id, sort)

  return (
    <li>
      <input
        type="checkbox"
        checked={todo.done}
        onChange={mutate}
      />
      {todo.title}
    </li>
  )
}

export function TodoList() {
  const [sort, setSort] = React.useState('id')
  const { status, data, isPlaceholderData } = useTodos(sort)
  const addTodo = useAddTodo()

  if (status === 'pending') {
    return <div>...</div>
  }

  if (status === 'error') {
    return <div>Error fetching todos</div>
  }

  const handleAddTodo = (event) => {
    event.preventDefault()
    const title = new FormData(event.currentTarget).get('add')
    addTodo.mutate(title, {
      onSuccess: () => event.target.reset()
    })
  }

  return (
    <div style={{ opacity: isPlaceholderData ? 0.8 : 1 }}>
      <label>
        Sort by:
        <select
          value={sort}
          onChange={(event) => {
            setSort(event.target.value)
        }}>
          <option value="id">id</option>
          <option value="title">title</option>
          <option value="done">completed</option>
        </select>
      </label>
      <ul>
        {data.map(todo => (
          <Todo todo={todo} key={todo.id} sort={sort} />
        ))}
      </ul>
      <form
        onSubmit={handleAddTodo}
        style={{ opacity: addTodo.isPending ? 0.8 : 1 }}
      >
        <label>Add:
          <input
            type="text"
            name="add"
            placeholder="new todo"
          />
        </label>
        <button
          type="submit"
          disabled={addTodo.isPending}
        >
          Submit
        </button>
      </form>
    </div>
  )
}


Si aún no lo has hecho, alterna la red en las Query Devtools, interactúa con la aplicación y luego vuelve a alternar la red para activarla de nuevo. En su mayor parte, verás que la aplicación se comporta bastante bien.

La razón por la que esto funciona tan bien es porque onMutate, que escribe en la caché, se llama antes de que la mutación se pause. Una vez que volvemos a estar online, podemos ver que cada casilla de verificación cambia de estado una por una, en el orden en que ocurrieron.

Sin embargo, hay un cambio que podríamos hacer para que sea aún mejor. ¿Puedes detectarlo?

Ahora mismo, una vez finalizada, cada mutación llama a queryClient.invalidateQueries. Esto estaba bien antes, pero ahora tenemos un escenario en el que múltiples mutaciones afectarán a la misma entidad. El resultado, como podemos ver claramente, es una UI eventualmente consistente, pero esas invalidaciones intermedias nos muestran un estado intermedio del servidor que hace que la UI salte un poco.

En cambio, sería ideal que cuando la aplicación se reconectara, solo invalidara la query una vez, al final de la cadena de mutaciones.

Para hacer esto, necesitamos ser un poco ingeniosos.

Primero, dentro de onSettled (que se ejecutará cuando todos los demás callbacks hayan terminado de ejecutarse), solo invalidaremos la query si no hay otras mutaciones en curso en ese momento. De esta manera, podemos deshacernos de esas invalidaciones intermedias que hacen que la UI "salte".

Para hacer esto, podemos usar la API isMutating de queryClient. Funciona devolviendo un número entero que representa cuántas mutaciones, si las hay, están ocurriendo actualmente.

Por supuesto, solo queremos invalidar nuestra query si está ocurriendo 1 mutación: la nuestra.


 onSettled: () => {
+  if (queryClient.isMutating() === 1) {
     return queryClient.invalidateQueries({ queryKey: ['todos', 'list'] })
+  }
 },


Pero, ¿causaría esto problemas si tuviéramos otras mutaciones no relacionadas ocurriendo al mismo tiempo? Sí, lo haría. Así que, en lugar de solo verificar si no hay otras mutaciones en curso, lo que realmente queremos hacer es verificar si no hay otras mutaciones en curso que afecten a las listas de tareas (todos).

Afortunadamente, React Query nos permite etiquetar nuestras mutaciones con un mutationKey y pasarlo como filtro a isMutating. Esto es bastante similar a pasar una queryKey a una Query, excepto que es opcional:


 onSettled: () => {
+  if (queryClient.isMutating({ mutationKey: ['todos', 'list'] }) === 1) {
     return queryClient.invalidateQueries({ queryKey: ['todos', 'list'] })
+  }
 },


Y si añadimos esto a nuestra aplicación, observa cómo la UI ya no "salta" cuando vuelves a estar online.


import * as React from 'react'
import { 
  useQuery, 
  useMutation, 
  useQueryClient 
} from '@tanstack/react-query'
import { fetchTodos, addTodo, toggleTodo } from './api'

function useToggleTodo(id, sort) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => toggleTodo(id),
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: ['todos', 'list', { sort }]
      })

      const snapshot = queryClient.getQueryData(
        ['todos', 'list', { sort }]
      )

      queryClient.setQueryData(
        ['todos', 'list', { sort }],
        (previousTodos) => previousTodos?.map((todo) =>
          todo.id === id ? { ...todo, done: !todo.done } : todo
        )
      )

      return () => {
        queryClient.setQueryData(
          ['todos', 'list', { sort }],
          snapshot
        )
      }
    },
    onError: (error, variables, rollback) => {
      console.log('error', error)
      rollback?.()
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: ['todos', 'list'] }) === 1) {
        return queryClient.invalidateQueries({ queryKey: ['todos', 'list'] })
      }
    },
  })
}

function useTodos(sort) {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: ['todos', 'list', { sort }],
    queryFn: () => fetchTodos(sort),
    placeholderData: queryClient.getQueryData(['todos', 'list', { sort }]),
    staleTime: 10 * 1000
  })
}

function useAddTodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addTodo,
    onSuccess: () => {
      return queryClient.invalidateQueries({
        queryKey: ['todos', 'list']
      })
    }
  })
}

function Todo({ todo, sort }) {
  const { mutate, isPending } = useToggleTodo(todo.id, sort)

  return (
    <li>
      <input
        type="checkbox"
        checked={todo.done}
        onChange={mutate}
      />
      {todo.title}
    </li>
  )
}

export function TodoList() {
  const [sort, setSort] = React.useState('id')
  const { status, data, isPlaceholderData } = useTodos(sort)
  const addTodo = useAddTodo()

  if (status === 'pending') {
    return <div>...</div>
  }

  if (status === 'error') {
    return <div>Error fetching todos</div>
  }

  const handleAddTodo = (event) => {
    event.preventDefault()
    const title = new FormData(event.currentTarget).get('add')
    addTodo.mutate(title, {
      onSuccess: () => event.target.reset()
    })
  }

  return (
    <div style={{ opacity: isPlaceholderData ? 0.8 : 1 }}>
      <label>
        Sort by:
        <select
          value={sort}
          onChange={(event) => {
            setSort(event.target.value)
        }}>
          <option value="id">id</option>
          <option value="title">title</option>
          <option value="done">completed</option>
        </select>
      </label>
      <ul>
        {data.map(todo => (
          <Todo todo={todo} key={todo.id} sort={sort} />
        ))}
      </ul>
      <form
        onSubmit={handleAddTodo}
        style={{ opacity: addTodo.isPending ? 0.8 : 1 }}
      >
        <label>Add:
          <input
            type="text"
            name="add"
            placeholder="new todo"
          />
        </label>
        <button
          type="submit"
          disabled={addTodo.isPending}
        >
          Submit
        </button>
      </form>
    </div>
  )
}


¡Mucho mejor!

Al invalidar la query solo si no hay otras mutaciones en curso que afecten a las listas de tareas, hemos conseguido eliminar ese "salto" en la interfaz de usuario mientras mantenemos la aplicación consistente con el servidor cuando vuelve a estar online.

🛜 networkMode y Mutaciones:

Lo genial de networkMode es que no es solo para queries, sino también para mutaciones.

La razón por la que nuestra aplicación funciona tan bien es porque el networkMode predeterminado para las mutaciones, al igual que para las queries, es online. Esto significa que cuando el dispositivo está sin conexión y se realiza una mutación, React Query "pausará" la mutación y la añadirá a una cola.

Al igual que con las queries, si deseas cambiar este comportamiento, puedes hacerlo mediante la opción networkMode.