## Managing Mutations

Todo gestor de estado hace dos cosas: te proporciona datos y te permite actualizarlos.

Toma como ejemplo React.useState. Devuelve una tupla donde el primer elemento es el estado y el segundo es una función para actualizar ese estado.


const [number, setNumber] = useState(0)


Por supuesto, esto es para el estado del cliente (client state). Sabemos que podemos llamar a setNumber de forma segura cuando queramos porque nosotros somos los dueños del estado. Para todos los efectos, podemos tratar esta actualización como si fuera sincrónica. 

"Técnicamente, React programa la actualización y no la realiza inmediatamente, pero la función en sí misma se sigue ejecutando de forma sincrónica."

Pero, ¿qué pasa con las actualizaciones de estado asíncronas?

En ese escenario, no somos los dueños del estado, así que incluso si escribiéramos directamente en la caché, simplemente se sobrescribiría con el siguiente refetch.

Por ejemplo, digamos que quisiéramos actualizar una entidad de user en nuestra base de datos y pudiéramos hacerlo desde el frontend enviando una solicitud PATCH.


function updateUser({ id, newName }) {
  return fetch(`/user/${id}`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      name: newName
    })
  }).then(res => res.json())
}


Esto, por supuesto, no sucede inmediatamente; no sería estado asíncrono si lo hiciera.

Cuando realizamos este tipo de actualizaciones, pasan por un ciclo de vida similar al de una consulta: pending (pendiente) -> error o success (éxito).

Entonces, dicho esto, ¿qué pasaría si simplemente usáramos useQuery para hacer una solicitud al servidor que realiza una actualización? Algo como esto:


function useUpdateUser(id, newName) {
  return useQuery({
    queryKey: ['user', id, newName],
    queryFn: () => updateUser({ id, newName }),
  })
}


Es una idea interesante, pero hay varias razones por las que esto no funcionaría.

Por un lado, la consulta se ejecutaría inmediatamente cuando el componente se montara. Probablemente querríamos esperar un evento específico (como que el usuario haga clic en un botón de envío) antes de ejecutarla. Podríamos solucionarlo con la opción enabled, pero lo que es peor: las consultas están destinadas a ejecutarse varias veces, a menudo automáticamente.

Ejecutar una consulta (como obtener una lista de artículos) debería ser una operación idempotente y no tener efectos secundarios en el servidor. Es decir, React Query debería poder ejecutar una consulta tan a menudo como quiera, sin consecuencias involuntarias (o de ningún tipo).

Las actualizaciones, por definición, no son ni idempotentes ni están libres de efectos secundarios. Cada vez que realizamos una actualización, se podrían escribir datos en la base de datos, se podría generar un PDF o se podría enviar un correo electrónico a alguien.

Todos estos efectos secundarios no son algo que queramos que se active automáticamente o más de una vez. En su lugar, queremos que sucedan de forma imperativa cuando ocurra un evento específico.

Para esto, React Query ofrece otro hook llamado useMutation.

Ahora, voy a decirte algo por adelantado: probablemente no funciona como esperarías (así que presta atención).

Así como useQuery gestiona el ciclo de vida de una consulta en lugar de obtener datos directamente, useMutation gestiona el ciclo de vida de una mutación en lugar de realizar la mutación en sí misma.

Así es como funciona:

Cuando invocas useMutation, le das un objeto con un método mutationFn. Lo que te devuelve es un objeto con un método mutate.


const { mutate } = useMutation({ mutationFn })


Cuando invocas mutate, React Query tomará el argumento que le pases e invocará la mutationFn con él.

Entonces, si adaptamos nuestro ejemplo anterior de updateUser para incluir React Query, así es como se vería.

Primero, encapsulamos useMutation dentro de un custom hook, pasándole updateUser como su mutationFn.


function useUpdateUser() {
  return useMutation({
    mutationFn: updateUser,
  })
}


Luego, dentro del componente, invocamos mutate cada vez que ocurre el evento de mutación. En este caso, será cuando se envíe un formulario (form).

El objeto que le pasamos se transferirá a la mutationFn como argumento.


function useUpdateUser() {
  return useMutation({
    mutationFn: updateUser,
  })
}

function ChangeName({ id }) {
  const { mutate } = useUpdateUser()

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        const newName = new FormData(event.currentTarget).get('name')
        mutate({ id, newName })
      }}
    >
      <input name="name" />
      <button type="submit">Update</button>
    </form>
  )
}


Para los usuarios de TypeScript:

Para que los tipos fluyan correctamente a través de las mutaciones, es importante tipar la mutationFn. Este es el mismo principio que con las Queries, pero es fácil pasarlo por alto porque la mutationFn también recibe parámetros.

Aquí tienes la traducción, manteniendo la estructura original:


En nuestro ejemplo, incluso si updateUser está tipado correctamente:


declare function updateUser(user: { id: string; newName: string }): Promise<User>


nuestra entrada para mutationFn no está tipada a menos que lo hagamos explícito:


type Payload = { id: string; newName: string }

function useUpdateUser() {
  return useMutation({
    mutationFn: (payload: Payload) =>
      updateUser(payload)
  })
}


Ahora sé lo que probablemente estás pensando: "no parece que useMutation esté haciendo gran cosa. ¿Por qué no llamar simplemente a updateUser directamente?".

Recuerda, el objetivo de useMutation es gestionar el ciclo de vida de la mutación, no mutar nada por sí mismo, ni siquiera la caché. Realmente no verás su beneficio hasta que lo mires desde esa perspectiva, y para eso, tienes que fijarte en lo que devuelve.

Cuando invocas useMutation, junto con la función mutate, también obtienes una propiedad status que te indica el estado actual de la mutación: pending (pendiente), error, success (éxito) o idle (inactivo, el estado predeterminado de la mutación antes de que se llame a mutate).

Así, por ejemplo, si quisiéramos deshabilitar el botón de envío mientras la mutación está en curso, podríamos hacer algo como esto.


function useUpdateUser() {
  return useMutation({
    mutationFn: updateUser,
  })
}

function ChangeName({ id }) {
  const { mutate, status } = useUpdateUser()

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        const newName = new FormData(event.currentTarget).get('name')
        mutate({ id, newName })
      }}
    >
      <input name="name" />
      <button type="submit" disabled={status === "pending"}>
        { status === "pending" ? '...' : "Update" }
      </button>
    </form>
  )
}


Y no solo observamos el status, también podemos conectar a diferentes momentos en el ciclo de vida de la mutación añadiendo callbacks onSuccess, onError o onSettled. Estos se pueden pasar como propiedades en el objeto que se le da a useMutation o como parte del segundo argumento que se le pasa a la función mutate.

Por ejemplo, probablemente queramos reiniciar el formulario después de que la mutación haya sido exitosa. Podemos hacer esto pasando un objeto con un callback onSuccess como segundo argumento de mutate.


function useUpdateUser() {
  return useMutation({
    mutationFn: updateUser,
  })
}

function ChangeName({ id }) {
  const { mutate, status } = useUpdateUser()

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        const newName = new FormData(event.currentTarget).get('name')
        mutate({ id, newName }, {
          onSuccess: () => event.currentTarget.reset()
        })
      }}
    >
      <input name="name" />
      <button type="submit" disabled={status === "pending"}>
        { status === "pending" ? '...' : "Update" }
      </button>
    </form>
  )
}


Y dentro de useMutation, si quisiéramos mostrar una alerta cuando la mutación fuera exitosa, podríamos hacer algo como esto.


function useUpdateUser() {
  return useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      alert("name updated successfully")
    }
  })
}


Y lo que sea que devuelva la mutationFn (en este caso, el valor de retorno de updateUser), se pasará como el primer argumento a onSuccess.

Así que, asumiendo que updateUser devuelve una promesa que se resuelve con el usuario actualizado, podríamos hacer algo como esto.


function useUpdateUser() {
  return useMutation({
    mutationFn: updateUser,
    onSuccess: (newUser) => {
      alert(`name updated to ${newUser.name}`)
    }
  })
}


Es cierto, este aspecto de useMutation no es particularmente interesante. Las partes interesantes llegan cuando empiezas a ver cómo las mutaciones y las consultas pueden trabajar juntas.

Por ejemplo, ¿qué pasaría si en lugar de solo mostrar una alerta, quisieras hacer algo realmente útil y actualizar la caché con el nuevo usuario?

La forma más sencilla es hacerlo de forma imperativa invocando queryClient.setQueryData en el callback onSuccess. setQueryData funciona como esperarías: le das una query key como primer argumento y los nuevos datos como segundo.


function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateUser,
    onSuccess: (newUser) => {
      queryClient.setQueryData(['user', newUser.id], newUser)
    }
  })
}


Ahora, una vez que la mutación haya finalizado y se ejecute el callback onSuccess, la caché se actualizará con el nuevo usuario.

Es importante señalar que React Query no distingue de dónde provienen los datos. Los datos que escribimos en la caché manualmente serán tratados de la misma manera que los datos introducidos en la caché por cualquier otra vía, como un refetch o un prefetch.

Esto significa que también se considerarán frescos (fresh) durante el tiempo que esté configurado staleTime.


Para los usuarios de TypeScript:

queryClient.setQueryData, al igual que getQueryData, está tipado como unknown por defecto, ya que React Query no puede saber qué datos deben residir bajo qué queryKey.

Una vez más, al igual que con getQueryData, esto mejora si utilizas una clave creada a partir de queryOptions:


import { queryOptions } from '@tanstack/react-query'

const userOptions = (id: number) => queryOptions({
  queryKey: ['user', id],
  queryFn: () => fetchUser(id)
})

queryClient.setQueryData(
  // Utilizamos la clave tipada
  userOptions(newUser.id).queryKey,
  newUser
)


Y aunque updateUser no devolviera una promesa que se resolviera con el usuario actualizado, todavía tenemos algunas opciones para derivar el nuevo usuario y así poder actualizar la caché.

Vimos que cuando React Query invoca onSuccess, el primer argumento que le pasa es lo que devuelva la mutationFn. Eso está bien, pero en este caso, es el segundo argumento el que es más valioso para nosotros.

Será el objeto que se le pasó a mutate, que en nuestro ejemplo es { id, newName }


function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateUser,
    onSuccess: (data, { id, newName }) => {

    }
  })
}


Podemos usar esto, junto con el hecho de que si pasas una función como segundo argumento a queryClient.setQueryData, esta recibirá los datos anteriores como argumento, para así poder derivar el nuevo usuario y actualizar la caché.


function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateUser,
    onSuccess: (data, { id, newName }) => {
      queryClient.setQueryData(
        ['user', id], 
        (previousUser) => previousUser
          ? ({ ...previousUser, name: newName }) 
          : previousUser
      )
    }
  })
}


Otra cosa a tener en cuenta es que, al igual que la mayoría de los gestores de estado en React, React Query requiere que las actualizaciones se realicen de manera inmutable.

Lo que esto significa es que cuando actualizas la caché, siempre debes devolver un objeto nuevo, incluso si el objeto que estás actualizando es el mismo que el anterior.

Por ejemplo, podrías verte tentado a refactorizar la invocación de setQueryData de esta manera, donde simplemente mutas el previousUser directamente:


queryClient.setQueryData(
  ['user', id], 
  (previousUser) => {
    if (previousUser) {
      previousUser.name = newName
    }

    return previousUser
  }
)


Pero si hicieras eso, React Query no podría detectar el cambio (ya que la referencia seguiría siendo la misma) y notificar a los observadores. En su lugar, siempre debes devolver un objeto nuevo, incluso si es igual al anterior.


Para los usuarios de TypeScript
El actualizador funcional tiene esta forma:


(previousData: TData | undefined) => TData | undefined


Esto significa que siempre debes esperar recibir undefined, ya que no hay garantía de que la Query ya exista en la caché cuando la estás actualizando.

En estos casos, simplemente puedes devolver undefined y React Query cancelará la actualización.


Hasta ahora, todo esto ha sido bastante directo: activar una mutación y luego actualizar la caché de forma imperativa cuando la mutación tiene éxito. Pero, no es raro tener más de una entrada de caché que necesites actualizar cuando ocurre una mutación.

Esto puede suceder fácilmente cuando tenemos una lista con filtros y opciones de ordenación. Cada vez que cambiamos una entrada, React Query creará una nueva entrada de caché, lo que significa que un mismo resultado puede almacenarse varias veces, en diferentes cachés, e incluso en diferentes posiciones (por ejemplo, dependiendo del criterio de ordenación).

Veamos un ejemplo que demuestra el problema.


import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchTodos, addTodo } from './api'

function useAddTodo() {
  return useMutation({
    mutationFn: addTodo,
    onSuccess: (data) => {
      console.log(JSON.stringify(data))
    }
  })
}

function useTodos(sort) {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: ['todos', 'list', { sort }],
    queryFn: () => fetchTodos(sort),
    placeholderData: () => queryClient.getQueryData(['todos', 'list', { sort }]),
    staleTime: 10 * 1000
  })
}

export default function TodoList() {
  const [sort, setSort] = React.useState('id')
  const { status, data, isPlaceholderData, refetch } = useTodos(sort)
  const addTodo = useAddTodo()

  const handleAddTodo = (event) => {
    event.preventDefault()
    const title = new FormData(event.currentTarget).get('add')
    addTodo.mutate(title, {
      onSuccess: () => event.target.reset()
    })
  }

  if (status === 'pending') {
    return <div>...</div>
  }

  if (status === 'error') {
    return <div>Error fetching todos</div>
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
        { data.map(todo => (
          <li key={todo.id}>
            {todo.done ? '✅ ' : '🗒 '}
            {todo.title}
          </li>
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
        <button
          type="button"
          onClick={refetch}
        >
          Refetch
        </button>
      </form>
    </div>
  )
}


Aquí tenemos una aplicación básica, pero finalmente incompleta, de lista de tareas (Todo list) que contiene un montón de cosas que ya hemos aprendido a lo largo del curso.

Estamos activando la mutación cuando se envía el formulario, pero aún no hemos implementado la actualización de la caché porque no es tan simple como llamar a queryClient.setQueryData con la lista actualizada.

El problema es que, debido a la ordenación, podríamos tener múltiples entradas de lista en la caché. En este escenario, ¿cuál de ellas actualizamos?


['todos', 'list', { sort: 'id' }]
['todos', 'list', { sort: 'title' }]
['todos', 'list', { sort: 'done' }]


Bueno, probablemente querríamos actualizarlas todas. El problema es que, incluso con solo tres opciones de sort (ordenación), esto se vuelve complicado bastante rápido.

Así es como se vería:


import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchTodos, addTodo } from './api'

function useAddTodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addTodo,
    onSuccess: (newTodo) => {
      queryClient.setQueryData(
        ['todos', 'list', { sort: 'id' }],
        (previousTodos) => [...previousTodos, newTodo ]
      )

      queryClient.setQueryData(
        ['todos', 'list', { sort: 'title' }],
        (previousTodos) => [...previousTodos, newTodo ].sort((a, b) => {
          if (String(a.title).toLowerCase() < String(b.title).toLowerCase()) {
            return -1
          }

          if (String(a.title).toLowerCase() > String(b.title).toLowerCase()) {
            return 1
          }

          return 0
        })
      )

      queryClient.setQueryData(
        ['todos', 'list', { sort: 'done' }],
        (previousTodos) => [...previousTodos, newTodo ]
          .sort((a, b) => a.done ? 1 : -1)
      )
    }
  })
}

function useTodos(sort) {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: ['todos', 'list', { sort }],
    queryFn: () => fetchTodos(sort),
    placeholderData: () => queryClient.getQueryData(['todos', 'list', { sort }]),
    staleTime: 10 * 1000
  })
}

export default function TodoList() {
  const [sort, setSort] = React.useState('id')
  const { status, data, isPlaceholderData } = useTodos(sort)
  const addTodo = useAddTodo()

  const handleAddTodo = (event) => {
    event.preventDefault()
    const title = new FormData(event.currentTarget).get('add')
    addTodo.mutate(title, {
      onSuccess: () => event.target.reset()
    })
  }

  if (status === 'pending') {
    return <div>...</div>
  }

  if (status === 'error') {
    return <div>Error fetching todos</div>
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
        { data.map(todo => (
          <li key={todo.id}>
            {todo.done ? '✅ ' : '🗒 '}
            {todo.title}
          </li>
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



Y este es el mejor de los escenarios. ¿Qué pasaría si la forma en que ordenamos la lista en nuestro callback onSuccess fuera diferente a la forma en que se ordenó en el backend, donde ocurre la mutación real?

En este escenario, el usuario vería la lista ordenada de una manera hasta que ocurriera un refetch, y luego la vería ordenada de otra.

Eso no es lo ideal.

En situaciones como esta, donde tienes un número arbitrario de entradas de caché que necesitan ser actualizadas, en lugar de actualizarlas todas manualmente, un enfoque mejor es simplemente invalidarlas todas.

La razón es que, cuando invalidas una consulta, suceden dos cosas:

Vuelve a solicitar los datos (refetches) de todas las consultas activas.

Marca como obsoletas (stale) las consultas restantes.

Si miramos esto desde los principios básicos, tiene mucho sentido.

Cuando invalidas una consulta, si esa consulta tiene un observador (lo que significa que está activa y es muy probable que sus datos se muestren en la UI), React Query la volverá a solicitar instantáneamente y actualizará la caché. De lo contrario, se marcará como obsoleta (stale) y React Query la volverá a solicitar la próxima vez que ocurra un disparador.

Ahora, la siguiente pregunta obvia es: ¿cómo invalidas una consulta?

Afortunadamente, React Query lo hace bastante simple y la mejor parte es que no tienes que preocuparte por los detalles específicos de cómo está estructurada la caché. Todo lo que tienes que hacer es invocar queryClient.invalidateQueries, pasándole a queryKey.


import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchTodos, addTodo } from './api'

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

function useTodos(sort) {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: ['todos', 'list', { sort }],
    queryFn: () => fetchTodos(sort),
    placeholderData: () => queryClient.getQueryData(['todos', 'list', { sort }]),
    staleTime: 10 * 1000
  })
}

export default function TodoList() {
  const [sort, setSort] = React.useState('id')
  const { status, data, isPlaceholderData } = useTodos(sort)
  const addTodo = useAddTodo()

  const handleAddTodo = (event) => {
    event.preventDefault()
    const title = new FormData(event.currentTarget).get('add')
    addTodo.mutate(title, {
      onSuccess: () => event.target.reset()
    })
  }

  if (status === 'pending') {
    return <div>...</div>
  }

  if (status === 'error') {
    return <div>Error fetching todos</div>
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
        { data.map(todo => (
          <li key={todo.id}>
            {todo.done ? '✅ ' : '🗒 '}
            {todo.title}
          </li>
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


Ahora, al devolver una promesa desde onSuccess (que es lo que devuelve queryClient.invalidateQueries), React Query puede esperar a que la promesa se resuelva antes de considerar que la mutación ha finalizado, evitando así posibles parpadeos en la interfaz de usuario donde el refetch ocurre antes de que la mutación haya terminado.

De nuevo, el truco está en que la invalidación realiza un refetch para las consultas activas. Así, en lugar de tomar la respuesta que regresa de la mutación y escribirla manualmente en la caché, la ignoramos por completo y obtenemos la fuente de verdad para la lista directamente desde el servidor.

Esto tiene algunas ventajas obvias: ya no tenemos que volver a implementar la lógica del servidor en el cliente, y nuestra lista tendrá la garantía de estar actualizada.

Por supuesto, tiene el inconveniente de tener que hacer otro viaje de ida y vuelta al servidor, pero esto está en línea con que React Query es una herramienta de sincronización de datos. Después de que el estado del servidor ha cambiado, generalmente es una buena idea verificar que tienes los datos más recientes en la caché.

Otro inconveniente es que las consultas no activas no se recargarán inmediatamente (ya que solo se marcan como stale o obsoletas). Normalmente esto es lo que quieres, pero si no te preocupara el exceso de solicitudes (overfetching), podrías añadir una propiedad refetchType con valor all a tus opciones de consulta para forzar a todas las consultas, independientemente de su estado, a recargarse inmediatamente.


queryClient.invalidateQueries({
  queryKey: ['todos', 'list'],
  refetchType: 'all'
})


Esto nos llevaría a una caché aún más consistente después de que ocurra una mutación.

Ahora hay un aspecto crucial para que invalidateQueries funcione que quizás no hayas notado. Incluso tiene un nombre elegante para que podamos ponerle brillo: la Coincidencia Flexible de Query Keys (Fuzzy Query Key matching).

Cuando invocamos invalidateQueries, le pasamos una query key de ['todos', 'list']. Esto le dice a React Query que invalide todas las consultas que comiencen con ['todos', 'list']. Es por eso que nuestras tres consultas de sort (ordenación) fueron invalidadas a pesar de que ninguna coincidía exactamente con ['todos', 'list'].


['todos', 'list', { sort: 'id' }]
['todos', 'list', { sort: 'title' }]
['todos', 'list', { sort: 'done' }]


Observa que esto funcionó porque estructuramos nuestra queryKey de forma jerárquica. De hecho, las query keys son arrays en primer lugar porque los arrays tienen una jerarquía estricta incorporada.

En términos prácticos, esto significa que querrás ordenar tus query keys de lo genérico a lo específico.

Si volvemos a nuestro ejemplo, todos es lo más genérico: se refiere a nuestra "entidad". Luego, tenemos la string codificada list, que hemos añadido para distinguir entre diferentes tipos de cachés de "todo". Finalmente, al final, podemos ver el sort específico.

Ahora, digamos que ampliamos nuestro ejemplo añadiendo una vista de detalle a la UI. Si hiciéramos eso, probablemente terminaríamos con una caché que se vería así:


['todos', 'list', { sort: 'id' }]
['todos', 'list', { sort: 'title' }]
['todos', 'detail', '1']
['todos', 'detail', '2']


Y luego, si añadiéramos otra característica totalmente no relacionada, como nuestra vista de Posts de la lección anterior, incluso podríamos tener una caché que se viera así:


['todos', 'list', { sort: 'id' }]
['todos', 'list', { sort: 'title' }]
['todos', 'detail', '1']
['todos', 'detail', '2']
['posts', 'list', { sort: 'date' }]
['posts', 'detail', '23']


Ahora, veamos cómo funcionaría la coincidencia flexible (fuzzy matching) si invalidáramos ['todos', 'list'].


queryClient.invalidateQueries({
  queryKey: ['todos', 'list']
})


Primero, React Query miraría la queryKey pasada, tomaría el primer elemento del array (todos) y filtraría todo lo que coincida con esa string.

Luego, las coincidencias restantes se compararían con el segundo valor de la clave, list.

Así, lo que queda, todas las "listas de todos", será invalidado.

Y no es solo contra la queryKey que puedes filtrar. Por ejemplo, podrías decirle a React Query que solo haga coincidir consultas obsoletas (stale) así:


queryClient.invalidateQueries({
  queryKey: ['todos', 'list'],
  stale: true // Solo invalida consultas obsoletas
})

O consultas que se estén usando activamente (las que tienen observadores), así:


queryClient.invalidateQueries({
  queryKey: ['todos', 'list'],
  type: 'active' // Solo invalida consultas activas
})


Y si quieres un control total, incluso puedes pasar una función predicate a invalidateQueries a la que se le pasará la consulta completa, que puedes usar para filtrar. Si la función devuelve true, coincidirá y se invalidará. Si devuelve false, se excluirá.

Esto es increíblemente potente, especialmente para los casos en los que la estructura de tu queryKey no te permite apuntar a todo con una sola declaración.

Por ejemplo, podrías apuntar a todas las consultas de detail, sin importar su entidad, de esta manera:


queryClient.invalidateQueries({
  predicate: (query) => query.queryKey[1] === 'detail'
})


De todos modos, la conclusión clave es que si estructuras tus queryKeys de manera apropiada, confiando en la coincidencia flexible, puedes invalidar un subconjunto completo de consultas con una sola llamada a invalidateQueries.


community help:

https://tkdodo.eu/blog/effective-react-query-keys

https://tanstack.com/query/latest/docs/framework/react/guides/disabling-queries#lazy-queries