## Error Handling


Ocasionalmente, ocurren rechazos de Promesas (Promise rejections), y cuando suceden (a pesar de la tendencia natural a querer ignorarlos y esperar lo mejor), generalmente es una buena idea manejarlos de manera apropiada.

Y a pesar de lo que la navegación web moderna pueda hacerte creer, las ruedas de carga infinitas (infinite spinners) no son una estrategia adecuada para el manejo de errores.

La primera línea de defensa, como hemos visto, es lanzar un error (throw) dentro de la queryFn.

De hecho, ya sea que lances un error, llames al método reject para una promesa construida manualmente, o devuelvas el resultado de Promise.reject(), cualquier rechazo de promesa le indica a React Query que ocurrió un error y que debe establecer el status de la query a error.


function useRepos() {
  return useQuery({
    queryKey: ['repos'],
    queryFn: async () => {
      const response = await fetch('https://api.github.com/orgs/TanStack/repos')
      
      if (!response.ok) {
        throw new Error(`Request failed with status: ${response.status}`)
      }

      return response.json()
    },
  })
}


Ahora puede llegar un momento en el que necesites depurar o envolver la respuesta de tu solicitud fetch dentro de tu queryFn. Para hacer esto, podrías sentir la tentación de manejar el error manualmente con catch.


function useRepos() {
  return useQuery({
    queryKey: ['repos'],
    queryFn: async () => {
      try {
        const response = await fetch('https://api.github.com/orgs/TanStack/repos')
        
        if (!response.ok) {
          throw new Error(`Request failed with status: ${response.status}`)
        }

        return response.json()
      } catch (e) {
        console.log("Error: ", e)
      }
    },
  })
}


Esto parece correcto, pero ahora tenemos un problema grave. Al capturar el error tú mismo con catch, a menos que lo lances de nuevo (throw) dentro del bloque catch, estás "tragándote" el error (swallowing the error), impidiendo que llegue a React Query.

Esto tiene varias desventajas, siendo la más obvia que React Query no sabrá que ocurrió un error y, por lo tanto, no podrá actualizar el status de la query correctamente.

Una desventaja menos obvia es que React Query tampoco sabrá que debe reintentar la solicitud. De hecho, por defecto, cuando una solicitud falla, React Query realizará 3 reintentos utilizando un algoritmo de backoff exponencial para determinar cuánto tiempo esperar entre cada uno.

Esto significa que cada intento es exponencialmente más largo que el anterior, comenzando con un retraso de 1 segundo y un máximo de 30 segundos.

Por supuesto, como ocurre con la mayoría de las cosas en React Query, este comportamiento por defecto es completamente personalizable mediante las opciones retry y retryDelay.

retry: Le dice a React Query cuántas veces debe reintentar la solicitud.

retryDelay: Le dice cuánto tiempo debe esperar entre cada intento fallido.

Así, en el código siguiente, React Query reintentará la solicitud 5 veces, con un retraso de 5000 milisegundos entre cada intento.


useQuery({
  queryKey: ['repos'],
  queryFn: fetchRepos,
  retry: 5,
  retryDelay: 5000,
})


Si necesitas un control aún más granular, puedes pasar una función a ambas opciones (me refiero a retry y retryDelay). Estas funciones recibirán el failureCount (conteo de fallos) y el error como argumentos que puedes usar para derivar tus valores.


useQuery({
  queryKey: ['repos'],
  queryFn: fetchRepos,
  retry: (failureCount, error) => {},
  retryDelay: (failureCount, error) => {},
})


Así, por ejemplo, si quisiéramos proporcionar nuestro propio algoritmo personalizado para el retraso entre reintentos, además de solo reintentar un error que tenga un código de estado en el rango 5xx, podríamos hacer algo como esto:


useQuery({
  queryKey: ['repos'],
  queryFn: fetchRepos,
  retry: (failureCount, error) => {
    if (error instanceof HTTPError && error.status >= 500) {
      return failureCount < 3
    }

    return false
  },
  retryDelay: (failureCount) => failureCount * 1000,
})


Y mientras estos reintentos están ocurriendo, la query permanecerá en un estado pending (pendiente).

Aunque a menudo a nuestros usuarios no les importa si la queryFn necesita ejecutarse más de una vez antes de obtener los datos, si los necesitas, React Query incluirá las propiedades failureCount (conteo de fallos) y failureReason (razón del fallo) en el objeto que devuelve useQuery.

Además, ambos valores se restablecerán tan pronto como la query pase a un estado success (éxito).

Estos valores te dan la flexibilidad de actualizar tu interfaz de usuario en caso de una solicitud de datos fallida. Por ejemplo, podrías mostrar un mensaje al usuario indicando que la solicitud está tardando más de lo esperado, o incluso ser creativo y mostrarles cuántas solicitudes has intentado realizar.


TodoList.js:
import * as React from "react"
import { useQuery } from '@tanstack/react-query'
import { fetchTodos } from './api'

function useTodos() {
  return useQuery({
    queryKey: ['todos', 'list'],
    queryFn: fetchTodos,
    retryDelay: 1000,
  })
}

export default function TodoList() {
  const { status, data, failureCount } = useTodos()

  if (status === 'pending') {
    return (
      <div>
        ...{failureCount > 1  ? <span>(This is taking longer than expected. Hang tight.)</span> : null}

        <i>retry attempts: {failureCount}</i>
      </div>
    )
  }

  if (status === 'error') {
    return <div>There was an error fetching the todos</div>
  }

  return (
    <div>
      <ul>
        {data.map((todo) => (
          <li key={todo.id}>
            {todo.title}
          </li>
        ))}
      </ul>
    </div>
  )
}


Ten en cuenta que si quieres configurar las opciones retry o retryDelay por tu cuenta, generalmente es una buena idea hacerlo a nivel global para asegurar la consistencia en toda tu aplicación.


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 5,
      retryDelay: 5000,
    },
  },
})


Por supuesto, el reintento no garantiza que la solicitud finalmente tendrá éxito, solo le da algunas oportunidades más. En el escenario donde la solicitud realmente falla y la query entra en un estado error, todavía necesitamos manejarlo con elegancia.

La primera opción, como hemos visto en numerosas ocasiones a lo largo de este curso, es verificar el status de la query y renderizar una IU de error genérica si se encuentra en un estado error.


if (status === 'error') {
  return <div>There was an error fetching the data</div>
}


Y algo que no hemos visto es que, si quieres ser más específico, siempre puedes acceder al mensaje de error exacto y mostrarlo al usuario a través de error.message.


TodoList.js:
import * as React from "react"
import { useQuery } from '@tanstack/react-query'
import { fetchTodos } from './api'

function useTodos() {
  return useQuery({
    queryKey: ['todos', 'list'],
    queryFn: fetchTodos,
    retryDelay: 1000,
  })
}

export default function TodoList() {
  const { status, data, failureCount, error } = useTodos()

  if (status === 'pending') {
    return (
      <div>
        ...{failureCount > 1  ? <span>(This is taking longer than expected. Hang tight.)</span> : null}

        <i>retry attempts: {failureCount}</i>
      </div>
    )
  }

  if (status === 'error') {
    return <em>Error: {error.message}</em>
  }

  return (
    <div>
      <ul>
        {data.map((todo) => (
          <li key={todo.id}>
            {todo.title}
          </li>
        ))}
      </ul>
    </div>
  )
}


Este enfoque está bien, pero el inconveniente es que está acoplado a una query y un componente individuales. A menudo, cuando se gestiona la interfaz de usuario de errores en una arquitectura basada en componentes, es útil tener un manejador de errores de nivel superior y más amplio que pueda capturar y gestionar los errores que ocurren en cualquier parte de tu aplicación.

Afortunadamente, el propio React viene con una buena solución para este problema en los Límites de Error (Error Boundaries).

Si no estás familiarizado, un ErrorBoundary es un componente de React que es capaz de capturar un error que ocurre en cualquier lugar dentro de sus componentes hijos y mostrar una interfaz de usuario alternativa (fallback UI).


<ErrorBoundary fallback={<Error />}>
  <App />
</ErrorBoundary>


Y lo que los hace poderosos es que, como son solo componentes, puedes tener tantos como quieras y colocarlos en cualquier parte de tu aplicación. Esto te da un control granular tanto sobre cómo se manejan los errores como sobre lo que ve el usuario cuando ocurren.


<ErrorBoundary fallback={<GlobalError />}>
  <Header />
  <ErrorBoundary fallback={<DashboardError />}>
    <Dashboard />
  </ErrorBoundary>
  <ErrorBoundary fallback={<ProfileError />}>
    <Profile />
  </ErrorBoundary>
  <Footer />
</ErrorBoundary>


Aunque puedes crear tu propio componente ErrorBoundary, generalmente se recomienda utilizar el paquete react-error-boundary, que es el "oficialmente no oficial".

La desventaja de los Límites de Error, lamentablemente para nosotros, es que solo pueden capturar errores que ocurren durante el renderizado.

Incluso con React Query, la obtención de datos es un efecto secundario que ocurre fuera del flujo de renderizado de React. Esto significa que si ocurre un error durante un fetch en una queryFn, no será capturado por un Error Boundary.

Esto es, a menos que podamos encontrar una manera de decirle a React Query que lance el error de nuevo después de capturarlo él mismo.

Como siempre, React Query tiene una opción de configuración que habilita esto: throwOnError.

Cuando es true, throwOnError le indica a React Query que lance un error cuando este ocurra, para que un ErrorBoundary pueda capturarlo y mostrar su interfaz de usuario alternativa (fallback UI).


TodoList.js
import * as React from "react"
import { useQuery } from '@tanstack/react-query'
import { fetchTodos } from './api'

function useTodos() {
  return useQuery({
    queryKey: ['todos', 'list'],
    queryFn: fetchTodos,
    retryDelay: 1000,
    throwOnError: true,
  })
}

export default function TodoList() {
  const { status, data, failureCount } = useTodos()

  if (status === 'pending') {
    return (
      <div>
        ...{failureCount > 1  ? <span>(This is taking longer than expected. Hang tight.)</span> : null}

        <i>retry attempts: {failureCount}</i>
      </div>
    )
  }

  return (
    <div>
      <ul>
        {data.map((todo) => (
          <li key={todo.id}>
            {todo.title}
          </li>
        ))}
      </ul>
    </div>
  )
}


App.js:
import TodoList from './TodoList'
import { ErrorBoundary } from 'react-error-boundary'

function Fallback({ error }) {
  return <p>Error: { error.message }</p>
}

export default function App() {
  return (
    <ErrorBoundary FallbackComponent={Fallback}>
      <TodoList />
    </ErrorBoundary>
  )
}

Debido a que le hemos dicho a React Query que throwOnError (lance el error en caso de error) y hemos envuelto nuestro componente TodoList en un ErrorBoundary, pudimos mover la lógica de manejo de errores fuertemente acoplada desde dentro del componente a un manejador de errores de nivel superior y más global.

Y lo que es aún más importante, si añadiéramos más componentes hijos, cualquier error de obtención de datos que ocurriera en ellos sería gestionado por el mismo ErrorBoundary.

Ahora, hay un escenario más que debes considerar en el que quizás no hayas pensado: restablecer el Límite de Error (Error Boundary). Por ejemplo, ¿qué pasa si solo quieres mostrar la IU de error durante una cierta cantidad de tiempo, o hasta que el usuario haga clic en un botón para reintentar la solicitud?

Si lo piensas, hay realmente dos partes en esto:

Necesitamos una forma de "restablecer" literalmente el ErrorBoundary y dejar de mostrar la IU de alternativa (fallback UI).

Necesitamos una forma de decirle a React Query que vuelva a obtener los datos de la query (es decir, que la reintente).

Para "restablecer" el ErrorBoundary y dejar de mostrar la IU alternativa, podemos usar la función resetErrorBoundary que el paquete react-error-boundary pasa al componente FallbackComponent.


import TodoList from './TodoList'
import { ErrorBoundary } from 'react-error-boundary'

function Fallback({ error, resetErrorBoundary }) {
  return (
    <>
      <p>Error: { error.message }</p>
      <button onClick={resetErrorBoundary}>
        Try again
      </button>
    </>
  )
}

export default function App() {
  return (
    <ErrorBoundary FallbackComponent={Fallback}>
      <TodoList />
    </ErrorBoundary>
  )
}


Para indicarle a React Query que vuelva a obtener los datos de la query... bueno, me gustaría que fuera tan simple como solo llamar a una función, pero es un poco más complicado.

Primero, utilizaremos el propio límite de React Query, QueryErrorResetBoundary.

La forma en que funciona QueryErrorResetBoundary es que le proporcionas una función como su prop children, y cuando React Query invoca esa función, le pasa una función reset que puedes usar para restablecer cualquier error de query dentro de los límites del componente.


<QueryErrorResetBoundary>
  {({ reset }) => (
    
  )}
</QueryErrorResetBoundary>


Ahora, si pasamos la función reset como una prop onReset al componente ErrorBoundary, cada vez que se invoque resetErrorBoundary, se ejecutará la función onReset, invocando reset. Esto restablecerá cualquier error de query y, por lo tanto, volverá a obtener los datos de la query.


TodoList.js:
import * as React from "react"
import { useQuery } from '@tanstack/react-query'
import { fetchTodos } from './api'

function useTodos() {
  return useQuery({
    queryKey: ['todos', 'list'],
    queryFn: fetchTodos,
    retryDelay: 1000,
    throwOnError: true,
  })
}

export default function TodoList() {
  const { status, data, failureCount } = useTodos()

  if (status === 'pending') {
    return (
      <div>
        ...{failureCount > 1  ? <span>(This is taking longer than expected. Hang tight.)</span> : null}

        <i>retry attempts: {failureCount}</i>
      </div>
    )
  }

  return (
    <div>
      <ul>
        {data.map((todo) => (
          <li key={todo.id}>
            {todo.title}
          </li>
        ))}
      </ul>
    </div>
  )
}


App.js:
import TodoList from './TodoList'
import { ErrorBoundary } from 'react-error-boundary'
import { QueryErrorResetBoundary } from '@tanstack/react-query'

function Fallback({ error, resetErrorBoundary }) {
  return (
    <>
      <p>Error: { error.message }</p>
      <button onClick={resetErrorBoundary}>
        Try again
      </button>
    </>
  )
}

export default function App() {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          FallbackComponent={Fallback}
        >
          <TodoList />
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  )
}


Y como hemos visto antes, si necesitas un control aún mayor sobre cómo o qué errores se lanzan, puedes pasar una función a throwOnError.

Cuando lo haces, a esa función se le pasarán dos argumentos: el error que ocurrió y la query.


throwOnError: (error, query) => {

}


Si la función devuelve true, el error será lanzado al ErrorBoundary. De lo contrario, no lo será.

Por ejemplo, el inconveniente de nuestra implementación actual es que todos los errores serán lanzados al ErrorBoundary, incluso aquellos que ocurren durante las re-obtenciones en segundo plano (background refetches).

Lo más probable es que, si el usuario ya tiene datos y una re-obtención en segundo plano falla, queramos que falle silenciosamente. Para lograr eso, podemos devolver true desde throwOnError solo si query.state.data es undefined (es decir, solo si la query inicial falló y no hay datos que mostrar).


function useTodos() {
  return useQuery({
    queryKey: ['todos', 'list'],
    queryFn: fetchTodos,
    retryDelay: 1000,
    throwOnError: (error, query) => {
      return typeof query.state.data === 'undefined'
    }
  })
}


O si solo quisieras que los errores en el rango 5xx fueran lanzados al ErrorBoundary, podrías hacer algo como esto:


function useTodos() {
  return useQuery({
    queryKey: ['todos', 'list'],
    queryFn: fetchTodos,
    retryDelay: 1000,
    throwOnError: (error, query) => {
      return error.status >= 500
    }
  })
}


Y como siempre, si quisieras ajustar el comportamiento por defecto y global para todas las queries, podrías configurarlo directamente en el propio QueryClient.


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      throwOnError: (error, query) => {
        return typeof query.state.data === 'undefined'
      }
    }
  }
})


Así que, llegados a este punto, has visto cómo la combinación de los Límites de Error (Error Boundaries) con throwOnError te proporciona una forma declarativa de manejar cualquier error que ocurra en tu aplicación. Sin embargo, a veces, la solución simple e imperativa es el enfoque correcto.

Por ejemplo, puede que haya un momento en el que solo quieras mostrar una notificación toast cuando ocurre un error. En este escenario, no tendría sentido lanzar el error a un ErrorBoundary porque no estás intentando mostrar una IU alternativa (fallback UI), solo estás intentando mostrar un toast.

Sin React Query, lo más probable es que terminarías con algo como esto, donde usas useEffect para encapsular la lógica del efecto secundario (side effect) de la notificación toast:


import * as React from "react"
import { useQuery } from '@tanstack/react-query'
import { fetchTodos } from './api'
import toast from 'react-hot-toast'

function useTodos() {
  const query = useQuery({
    queryKey: ['todos', 'list'],
    queryFn: fetchTodos,
    retryDelay: 1000,
  })

  React.useEffect(() => {
    if (query.status === 'error') {
      toast.error(query.error.message)
    }
  }, [query.error, query.status])

  return query
}

export default function TodoList() {
  const { status, data, failureCount } = useTodos()

  if (status === 'pending') {
    return (
      <div>
        <i>retry attempts: {failureCount}</i>
      </div>
    )
  }

  if (status === 'error') {
    return <i>(refresh the sandbox if you don't see anything)</i>
  }

  return (
    <div>
      <ul>
        {data.map((todo) => (
          <li key={todo.id}>
            {todo.title}
          </li>
        ))}
      </ul>
    </div>
  )
}


Esto funciona (en nuestra aplicación simple), pero nuestro código ahora contiene el peor tipo de bug: uno que no aparecerá de inmediato. ¿Puedes detectarlo?

¿Qué sucedería si llamáramos a useTodos de nuevo en otra parte de nuestra aplicación? Suponiendo que ocurra un error, terminaríamos con dos notificaciones toast, una por cada invocación de useTodos. Obviamente, eso no es ideal.

En este escenario, lo que realmente queremos es una función callback global que se invoque solo una vez por query, no por cada invocación del hook. Afortunadamente, React Query también proporciona una manera simple de hacer esto a través del QueryClient.

Ya sabes que el QueryClient contiene la QueryCache, pero lo que quizás no sepas es que cuando creas el QueryClient, también puedes crear tú mismo el QueryCache si necesitas más control sobre cómo se gestiona la caché.

Por ejemplo, en nuestro escenario, queremos mostrar una notificación toast cada vez que la query entre en un estado error. Podemos hacer eso poniendo nuestra lógica de toast en el callback onError cuando creamos el QueryCache.



App.js:
import TodoList from './TodoList'
import toast, { Toaster } from 'react-hot-toast'
import { QueryClient, QueryCache, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      toast.error(error.message)
    }
  })
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TodoList />
      <Toaster/>
    </QueryClientProvider>
  )
}


Por supuesto, la forma en que manejas los errores depende de los requisitos de tu aplicación, pero React Query te da la flexibilidad de manejarlos de una manera que tenga sentido para ti.

Si deseas un enfoque con opinión (opinionated approach), esta es la configuración predeterminada que utilizamos:


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      throwOnError: (error, query) => {
        return typeof query.state.data === 'undefined'
      }
    }
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (typeof query.state.data !== 'undefined') {
        toast.error(error.message)
      }
    }
  })
})


Con esta configuración:

Si hay datos en la caché y la query entra en un estado error (lo que sucede a menudo durante un refetch en segundo plano), ya que es muy probable que el usuario ya esté viendo los datos existentes, mostramos una notificación toast (usando el callback onError del QueryCache).

De lo contrario (si el fallo ocurre en la query inicial y no hay datos), lanzamos el error a un ErrorBoundary (usando throwOnError: query => !query.state.data).

Al configurar esta lógica una sola vez y de forma global en tu aplicación, no tendrás que preocuparte por el manejo de errores en tus componentes individuales.