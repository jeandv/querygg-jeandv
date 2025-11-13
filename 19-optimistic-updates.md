## Optimistic Updates

Cuando se trata de obtener datos (fetching), hemos visto cómo React Query te proporciona herramientas para ayudarte a evitar mostrar indicadores de carga a tus usuarios, manteniendo tu UI ágil y responsiva.

Sin embargo, cuando estamos mutando datos (mutating), aún no hemos visto ese mismo nivel de pulido. Hasta este punto, solo hemos visto el comportamiento por defecto de la mayoría de las aplicaciones web: el usuario hace clic en un botón, se envía una mutación al servidor y la UI espera hasta que el servidor responde con un OK antes de mostrar la actualización.

Podemos ver esto claramente en nuestro ejemplo de Tareas (Todos) de la lección anterior.

En este escenario, no es tan grave, ya que es bastante obvio para el usuario que la aplicación está esperando que el servidor confirme la nueva tarea antes de añadirla a la lista.

Sin embargo, ¿qué pasaría si actualizáramos nuestra aplicación para poder alternar el estado de un elemento de tarea? En este escenario, si esperamos a que el servidor confirme la actualización antes de modificar la casilla de verificación, la aplicación se sentirá lenta (como si fuera una "mierda", laggy).


import * as React from 'react'
import { 
  useQuery, 
  useMutation, 
  useQueryClient 
} from '@tanstack/react-query'
import { fetchTodos, addTodo, toggleTodo } from './api'

function useToggleTodo(id) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => toggleTodo(id),
    onSuccess: () => {
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

function Todo({ todo }) {
  const { mutate } = useToggleTodo(todo.id)

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
          <Todo todo={todo} key={todo.id} />
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


¡Qué asco!

En estos escenarios, si ya sabes cómo debería verse la UI final después de la mutación, casi siempre querrás mostrarle al usuario el resultado de su acción de inmediato, y luego revertir la UI si el servidor responde con un error. Este es un patrón tan común que incluso tiene un nombre elegante:

Actualizaciones Optimistas (Optimistic Updates).

Así que, sabiendo lo que ya conoces sobre React Query, ¿cómo abordarías la implementación de esto?

De nuevo, la idea es que simplemente queremos asumir que la mutación tendrá éxito y mostrar las actualizaciones al usuario inmediatamente. En nuestro ejemplo, eso significa alternar la casilla de verificación tan pronto como el usuario haga clic en ella.

Para hacer esto, necesitamos saber cuándo la mutación está pendiente. Si lo está, entonces la casilla de verificación debería estar en el estado opuesto al que tenía antes (ya que, por matemáticas, ese es el único cambio de estado posible para una casilla). Si no lo está, entonces debería permanecer igual.

Afortunadamente, como sabemos, useMutation nos proporciona un status (así como los valores derivados isPending, isError e isSuccess) que podemos usar para determinar si la mutación está en curso.


function Todo({ todo }) {
  const { mutate, isPending } = useToggleTodo(todo.id)

  return (
    <li>
      <input
        type="checkbox"
        checked={isPending ? !todo.done : todo.done}
        onChange={mutate}
      />
      {todo.title}
    </li>
  )
}


Y si lo incorporamos a nuestra aplicación, así es como se comporta.


import * as React from 'react'
import { 
  useQuery, 
  useMutation, 
  useQueryClient 
} from '@tanstack/react-query'
import { fetchTodos, addTodo, toggleTodo } from './api'

function useToggleTodo(id) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => toggleTodo(id),
    onSuccess: () => {
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

function Todo({ todo }) {
  const { mutate, isPending } = useToggleTodo(todo.id)

  return (
    <li>
      <input
        type="checkbox"
        checked={isPending ? !todo.done : todo.done}
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
          <Todo todo={todo} key={todo.id} />
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


Esto parece funcionar bien, y con este enfoque no necesitamos gestionar la reversión de la interfaz de usuario si la mutación falla. La razón es que solo estamos observando el estado (status) de la mutación para determinar el estado de nuestra casilla de verificación, y no estamos invalidando ninguna query ni actualizando la caché hasta que la mutación tiene éxito.

De nuevo, así es como funciona el proceso completo:

Mientras la query está pendiente (pending), el estado de la casilla de verificación será el opuesto al que está actualmente en la caché. A partir de ahí, si la mutación tiene éxito, la query se invalidará y la interfaz de usuario permanecerá igual (ya que ya estaba mostrando la actualización optimista). Si la mutación falla, en ese momento la mutación ya no está pendiente y el estado de la casilla de verificación volverá a ser el que tenía antes de que se intentara la mutación, que también es el valor exacto que está en la caché.

Este enfoque es simple, pero su simplicidad es también su debilidad.

Fíjate en lo que sucede cuando haces clic en varias casillas de verificación seguidas, antes de que cualquier mutación haya tenido tiempo de completarse e invalidar la query.

El estado de las casillas de verificación será consistente con el estado del servidor, eventualmente.

Debido a que no estamos actualizando la caché sino hasta después de que la mutación es exitosa, si haces clic en varias casillas de verificación seguidas, hay un momento entre que la mutación original ha finalizado y la caché se ha actualizado. En este momento, el estado de la casilla inicial será inconsistente con el estado del servidor.

Esto se corregirá por sí mismo una vez que la última mutación haya tenido éxito y las queries hayan sido invalidadas, pero no es una gran experiencia para el usuario.

En lugar de invalidar las queries cuando una mutación tiene éxito y depender del status de la mutación para determinar el estado de la UI, ¿qué pasaría si simplemente actualizamos la caché de forma optimista y luego la revertimos si falla?

Así es como funcionaría eso en una mutación exitosa:

Esto resolvería nuestro problema de condición de carrera (race condition) ya que devolvería a la caché la función de ser la fuente única de la verdad para la interfaz de usuario.

Comencemos con nuestra implementación actual e imperfecta de useToggleTodo.


function useToggleTodo(id) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => toggleTodo(id),
    onSuccess: () => {
      return queryClient.invalidateQueries({
        queryKey: ['todos', 'list']
      })
    }
  })
}


Lo primero que haremos es deshacernos de nuestro callback onSuccess.

Dado que no se ejecuta sino hasta después de que la mutación ha tenido éxito, es demasiado tarde para que hagamos algo optimista con él.


function useToggleTodo(id) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => toggleTodo(id)
  })
}


A continuación, necesitamos una forma de ejecutar algo de código antes de que la mutación se envíe al servidor. Podemos hacer esto con el callback onMutate.


function useToggleTodo(id) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => toggleTodo(id),
    onMutate: () => {
      
    }
  })
}


Ahora, si colocamos nuestra lógica para actualizar la caché dentro de onMutate, React Query la ejecutará antes de enviar la mutación al servidor.


function useToggleTodo(id, sort) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => toggleTodo(id),
    onMutate: () => {
      queryClient.setQueryData(
        ['todos', 'list', { sort }],
        (previousTodos) => previousTodos?.map((todo) =>
          todo.id === id ? { ...todo, done: !todo.done } : todo
        )
      )
    }
  })
}


Ahora, si añadimos esto a nuestra aplicación, así es como se comportará.

Nota: También hemos tenido que pasar sort a useToggleTodo para poder actualizar la entrada correcta en la caché, y hemos actualizado nuestro componente Todo para que ya no cambie su estado basándose en el valor isPending.


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
    onMutate: () => {
      queryClient.setQueryData(
        ['todos', 'list', { sort }],
        (previousTodos) => previousTodos?.map((todo) =>
          todo.id === id ? { ...todo, done: !todo.done } : todo
        )
      )
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


¡Qué elegante! Una vez más, tenemos una interfaz de usuario asíncrona que se siente sincrónica.

Por supuesto, aún no hemos terminado. Tal como está, estamos asumiendo que la mutación tendrá éxito y estamos actualizando la caché de forma apropiada. Sin embargo, ¿qué pasa si falla? En ese escenario, necesitamos poder revertir la caché a lo que era previamente.

Para hacer esto, podemos usar el callback onError, el cual se ejecutará si la mutación falla.


function useToggleTodo(id, sort) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => toggleTodo(id),
    onMutate: () => {
      queryClient.setQueryData(
        ['todos', 'list', { sort }],
        (previousTodos) => previousTodos?.map((todo) =>
          todo.id === id ? { ...todo, done: !todo.done } : todo
        )
      )
    },
    onError: () => {

    }
  })
}


Lo que haremos a continuación puede ser un poco sorprendente, así que antes de que veas la implementación, quiero asegurarme de que entiendes el objetivo.

Si la mutación falla, debido a que ya actualizamos la caché de forma optimista asumiendo que tendría éxito, necesitamos revertir la caché al estado en el que se encontraba antes de que se intentara la mutación.

Para hacer esto, necesitamos dos cosas: una instantánea (snapshot) de la caché tal como estaba antes de que se intentara la mutación, y una forma de restablecer la caché a esa instantánea.

Para la instantánea, en realidad queremos obtenerla dentro de onMutate antes de que actualicemos la caché de forma optimista.


function useToggleTodo(id, sort) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => toggleTodo(id),
    onMutate: () => {
      const snapshot = queryClient.getQueryData(
        ['todos', 'list', { sort }]
      )

      queryClient.setQueryData(
        ['todos', 'list', { sort }],
        (previousTodos) => previousTodos?.map((todo) =>
          todo.id === id ? { ...todo, done: !todo.done } : todo
        )
      )
    },
    onError: () => {

    }
  })
}


Ahora necesitamos una forma de acceder a la instantánea (snapshot) dentro de onError para poder restablecer la caché a ese valor si ocurre un error.

Debido a que este es un problema común, React Query hará que cualquier cosa que devuelvas desde onMutate esté disponible como el tercer argumento en todos los demás callbacks.

Así que, en nuestro ejemplo, vamos a devolver una función desde onMutate que, cuando se invoque, restablecerá la caché a la instantánea.


function useToggleTodo(id, sort) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => toggleTodo(id),
    onMutate: () => {
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
    onError: () => {

    }
  })
}


Ahora, dentro de onError, podemos acceder a nuestra función de reversión (rollback) y llamarla para restablecer la caché.


function useToggleTodo(id, sort) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => toggleTodo(id),
    onMutate: () => {
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
      rollback?.()
    }
  })
}


Ahora, cada vez que ocurre un error, gracias a que hemos capturado el estado anterior de la caché en una instantánea mediante un closure, podemos invocar nuestra función de reversión (rollback), restableciendo la caché a lo que era antes de que se intentara la mutación.

En este punto, las tareas esenciales ya están hechas; solo nos quedan dos deseables que podemos añadir para hacer la experiencia aún más sólida.

Primero, queremos asegurarnos de que no haya otras solicitudes de actualización (refetches) sucediendo antes de que actualicemos manualmente la caché. Si no lo hacemos, y estas actualizaciones se resuelven después de haber realizado la actualización optimista de la caché, anularán el cambio, lo que llevaría a una interfaz de usuario inconsistente.

Para evitar esto, podemos llamar a queryClient.cancelQueries antes de cualquier otra lógica dentro de onMutate.


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
      rollback?.()
    }
  })
}


Finalmente, useMutation soporta otro callback, onSettled, el cual se ejecutará después de todos sus otros callbacks, independientemente de si la mutación tuvo éxito o falló.

Es una buena práctica invalidar siempre las queries necesarias dentro de onSettled solo para asegurarnos de que la caché esté definitivamente sincronizada con el servidor. Es probable que ya lo esté antes de esto (debido a la actualización optimista), pero si por alguna razón no lo está (como si el servidor respondiera con un valor diferente al esperado), invalidar la query disparará una nueva obtención de datos (refetch) y pondrá la caché en sincronía.


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


¡Muy sólido!

Antes de que ocurra la mutación, cancelamos cualquier obtención de datos en curso, capturamos una instantánea de la caché, actualizamos la caché de forma optimista para que el usuario obtenga feedback instantáneo, y devolvemos una función de reversión que restablecerá la caché a la instantánea si la mutación falla. Y por si acaso, después de que la mutación ha finalizado, invalidamos la query para asegurarnos de que la caché esté sincronizada con el servidor.

Como regla general, cada vez que el usuario necesite feedback instantáneo de una operación asíncrona, las actualizaciones optimistas suelen ser el camino a seguir.


- Abstracción Personalizada:

Dado que escribir actualizaciones optimistas en la caché implica bastante código, podría ser una buena idea abstraerlo en un hook personalizado useOptimisticMutation si utilizas este patrón con frecuencia.


 useOptimisticMutation({
   mutationFn: () => toggleTodo(id),
   queryKey: ['todos', 'list', { sort }],
   updater: (previousTodos) => previousTodos?.map((todo) =>
     todo.id === id
       ? { ...todo, done: !todo.done }
       : todo
   ),
   invalidates: ['todos', 'list'],
 })


Aquí tienes un ejemplo de cómo se vería ese código:


export const useOptimisticMutation = ({ mutationFn, queryKey, updater, invalidates }) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    
    // 1. onMutate: Captura la instantánea y actualiza optimistamente
    onMutate: async () => {
      // Cancela cualquier refetch en curso para evitar inconsistencias
      await queryClient.cancelQueries({
        queryKey,
      })

      // Captura la instantánea del estado actual de la caché (rollback data)
      const snapshot = queryClient.getQueryData(queryKey)

      // Actualiza la caché de forma optimista
      queryClient.setQueryData(queryKey, updater)

      // Devuelve la función de rollback que se usará en caso de error
      return () => {
        queryClient.setQueryData(queryKey, snapshot)
      }
    },
    
    // 2. onError: Si falla, ejecuta la función de rollback
    onError: (err, variables, rollback) => {
      // El tercer argumento contiene lo que se retornó en onMutate
      rollback?.()
    },
    
    // 3. onSettled: Se ejecuta al final, exitoso o fallido
    onSettled: () => {
      // Invalida la query para asegurar la sincronización final con el servidor
      return queryClient.invalidateQueries({
        queryKey: invalidates,
      })
    }
  })
}