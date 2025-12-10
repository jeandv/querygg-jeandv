## Testing Queries and Mutations


Esta lección no pretende enseñarte todo sobre las pruebas (testing), sino proporcionar algunos consejos para configurar React Query en tu entorno de pruebas. Estos principios funcionan para cualquier framework de pruebas automatizadas, como Cypress, Playwright o React Testing Library.

Durante esta lección, asumiremos que tienes configurado un framework de pruebas, como Jest, Vitest o Cypress. Dado que estamos renderizando componentes de React, este debe ser capaz de renderizarlos en una abstracción similar al DOM, como JSDOM. Herramientas como Cypress ofrecen su propia forma de [probar componentes](Image of Cypress Component Testing).

Nosotros usaremos React Testing Library ejecutada con Jest.

Muy pocos desarrolladores que conozco disfrutan escribiendo pruebas automatizadas, pero como le digo a mi hijo de 6 años a diario, a veces hay que hacer cosas que no quieres hacer.

Las pruebas automatizadas pueden tener varias formas y tamaños, pero todas sirven para el mismo propósito: maximizar las probabilidades de que tu aplicación funcione como se espera, y cuanto más se comporten tus pruebas como tus usuarios reales, más confianza pueden darte.

Por eso es importante probar las cosas correctas.

Cuando se trata de React Query, podría ser tentador probar los custom hooks que escribimos de forma aislada —piensa en usePosts o useRepos. Sin embargo, estos hooks están demasiado alejados de cómo interactúan realmente nuestros usuarios con nuestra aplicación.

En cambio, he encontrado útil probar los componentes que utilizan estos hooks. De esta manera, estamos probando el comportamiento real de nuestra aplicación, no solo los detalles de la implementación.

El componente que probaremos es el componente Blog que hemos visto varias veces a lo largo del curso. La implementación no importa aquí, pero como recordatorio, así es cómo funciona.


Tu primera intuición podría ser hacer algo como esto, donde simplemente pruebas que Blog se renderiza sin fallar usando la función render de @testing-library.


import { render } from "@testing-library/react";
import { Blog } from "./Blog"

describe("Blog", () => {
  test("successful Query", async () => {
    const rendered = render(<Blog />);
  })
})


Y si hicieras esto, te encontrarías directamente con este error muy común:

No QueryClient set, use QueryClientProvider to set one

La razón de esto es que Blog usa useQuery, lo cual requiere que haya un QueryClientProvider en algún lugar por encima de él en el árbol de componentes.

Obviamente, estamos haciendo eso en nuestro código de producción, pero actualmente no lo estamos haciendo en la prueba. Para solucionar esto, podemos hacer lo que hacemos habitualmente: envolver Blog dentro de un QueryClientProvider.


const queryClient = new QueryClient()

const rendered = render(
  <QueryClientProvider client={queryClient}>
    <Blog />
  </QueryClientProvider>
);


Mucho mejor, ahora el error debería haber desaparecido, pero podemos mejorarlo aún más.

Creando un Cliente de Pruebas Aislado
Renderizar con un cliente es algo que necesitaremos con bastante frecuencia, así que esta es una buena oportunidad para crear una abstracción simple. Ya que estamos, otra cosa de la que querremos asegurarnos es que cada prueba y cada llamada a render obtengan su propia instancia de QueryClient.

Si solo creamos un QueryClient una vez, se reutilizará durante las pruebas, lo que puede llevar a resultados de prueba inconsistentes.


function renderWithClient(ui) {
  const testQueryClient = new QueryClient();

  return render(
    <QueryClientProvider client={testQueryClient}>
      {ui}
    </QueryClientProvider>
  );
}


Ahora podemos usar esta función en lugar de llamar a render directamente en nuestra prueba:


describe("Blog", () => {
  test("successful Query", async () => {
    const rendered = renderWithClient(<Blog />);
  })
})


Esto también muestra por qué es importante llamar a useQueryClient() en el código de tu aplicación en lugar de simplemente importar el QueryClient de producción directamente.

useQueryClient() leerá del React Context Provider más cercano, y no le importa si contiene el cliente de producción o el de prueba. Si leyéramos el QueryClient directamente dentro de Blog, no podríamos proporcionar nuestro propio cliente dentro de nuestra prueba.

Configuración de las Opciones por Defecto
A continuación, debemos encargarnos de personalizar las opciones por defecto de nuestro QueryClient, ya que las opciones por defecto de React Query están diseñadas para ser más útiles para los usuarios reales mientras navegan por tu aplicación, no en un entorno de pruebas.

La primera opción que querrás ajustar es retry (reintento). Por defecto, React Query reintentará una query fallida tres veces. Esto es genial para los usuarios, pero de nuevo, no tan bueno para las pruebas.

Si una query falla una vez en una prueba, es probable que vuelva a fallar, por lo que no hay razón para seguir esperando mientras React Query reintenta la solicitud.


function renderWithClient(ui) {
  const testQueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false // Desactivar reintentos en las pruebas
      }
    }
  });

  return render(
    <QueryClientProvider client={testQueryClient}>
      {ui}
    </QueryClientProvider>
  );
}


Recuerda, defaultOptions solo se aplican si no las has sobrescrito en ningún otro lugar (como directamente al invocar useQuery). Por eso, generalmente es una buena idea anular cualquier opción por defecto en el QueryClient para tener más control al realizar pruebas.

Mockeo de API con Mock Service Worker (MSW)
Con eso, si ejecutáramos nuestra prueba tal como está, funcionaría, pero la solicitud se realizaría a la API de producción, lo que no es lo ideal por varias razones, principalmente porque no tenemos control.

Por ejemplo, ¿qué harías si necesitaras probar un escenario en el que la API devolviera un código de estado 500? ¿O qué pasaría si la API no está disponible cuando se ejecuta la prueba? ¿O qué pasaría si la API es simplemente lenta o usa muchos recursos?

Para resolver estos y otros problemas similares, los desarrolladores suelen recurrir a las pruebas "de extremo a extremo" (end-to-end), donde tienes una base de datos dedicada que se restablece cada vez después de que se ejecuta una prueba. Esto funciona, pero es costoso y se vuelve cada vez más difícil de gestionar a medida que tu aplicación crece.

En cambio, ¿qué pasaría si simplemente mockeáramos cualquier solicitud de API en nuestras pruebas? En este escenario, tendríamos control total sobre cómo responde la "API" y, a su vez, sobre cómo se comporta nuestra aplicación en cada escenario.

La herramienta que podemos recomendar para este trabajo es Mock Service Worker (MSW), que utiliza un Service Worker para interceptar las solicitudes de API y devuelve una respuesta mockeada. Funciona tanto en el navegador como en Node.js, lo que significa que podemos usar un ejecutor de pruebas estándar como Jest o Vitest y aun así tener nuestra API mockeada.

La idea es bastante simple: cada vez que se realiza una solicitud a /api/articles, queremos devolver una respuesta JSON estática.

Para llegar a eso, necesitamos configurar una capa de intercepción de solicitudes en NodeJS. MSW nos permite hacer esto con la función setupServer, donde podemos agregar Request Handlers (Manejadores de Solicitudes). Esos handlers interceptarán las solicitudes si coinciden con la URL proporcionada y responderán con lo que decidamos. Así es como se ve nuestro simple "servidor":


const server = setupServer(
  rest.get("*/api/articles", (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        {
          id: 1,
          title: "1st Post",
          description: "This is the first post",
          path: "/first/post",
        },
        {
          id: 2,
          title: "2nd Post",
          description: "This is the second post",
          path: "/second/post",
        },
      ])
    );
  })
);


Luego, podemos decirle a nuestro framework de pruebas que inicie el servidor antes de que comiencen las pruebas, que restablezca los handlers entre pruebas y que limpie después de que todas las pruebas hayan finalizado con este código.


// Establecer el mockeo de API antes de todas las pruebas.
beforeAll(() => server.listen());

// Restablecer cualquier manejador de solicitudes que podamos añadir durante las pruebas,
// para que no afecten a otras pruebas.
afterEach(() => server.resetHandlers());

// Limpiar después de que las pruebas hayan finalizado.
afterAll(() => server.close());


Ahora, cuando renderizamos nuestro componente <Blog />, las solicitudes que realice serán interceptadas por MSW y se devolverá la respuesta JSON estática.

A partir de aquí, podemos escribir algunas aserciones para confirmar este comportamiento, como esperar primero a que aparezca el estado de carga, seguido de una aserción de que podemos ver el título de nuestra publicación como un enlace.


describe("Blog", () => {
  test("successful Query", async () => {
    const rendered = renderWithClient(<Blog />);

    // Esperar a que el estado de carga inicial desaparezca (p. ej., "...")
    expect(await rendered.findByText("...")).toBeInTheDocument();
    
    // Esperar y verificar el título del primer post
    expect(
      await rendered.findByRole("link", { name: "1st Post" })
    ).toBeInTheDocument();
  });
});


Luego podemos extender nuestra prueba para que realmente haga clic en ese enlace y verifique si se renderiza nuestra página de detalles correctamente también.


test("successful query PostList", async () => {
  const rendered = renderWithClient(<Blog />);

  // 1. Mostrar estado de carga (simulado)
  expect(await rendered.findByText("...")).toBeInTheDocument();
  
  // 2. Hacer clic en el enlace del primer post
  fireEvent.click(
    await rendered.findByRole("link", { name: "1st Post" })
  );

  // 3. Mostrar estado de carga para la página de detalles
  expect(await rendered.findByText("...")).toBeInTheDocument();
  
  // 4. Verificar contenido de la página de detalles
  expect(await rendered.findByRole("heading", { name: "1st Post" })).toBeInTheDocument();
  expect(await rendered.findByText("First post body")).toBeInTheDocument();
});


Y para que esto funcione, también necesitamos mockear la ruta de detalle de la publicación: /first/post:


const server = setupServer(
  // Manejador para /api/articles (lista)
  rest.get("*/api/articles", (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        {
          id: 1,
          title: "1st Post",
          description: "This is the first post",
          path: "/first/post",
        },
        // ... (otros artículos)
      ])
    );
  }),
  // Manejador para /api/articles/first/post (detalle)
  rest.get("*/api/articles/first/post", (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        id: 1,
        title: "1st Post",
        body_markdown: "First post body",
        path: "/first/post",
      })
    );
  })
);


Ahora que hemos probado el camino feliz, veamos cómo se ve probar cuando las cosas salen mal.

Mockeo de Fallas de API
Tal como está, hemos configurado nuestro servidor mock para que devuelva un código de estado 200 con dos artículos, pero podemos anular eso con lo que se llama manejadores de solicitudes en tiempo de ejecución (runtime request handlers) para cualquier prueba dada con server.use.

Así es como se ve.


test("error on PostList", async () => {
  // Sobrescribir el manejador de /api/articles SÓLO para esta prueba
  server.use(
    rest.get("*/api/articles", (req, res, ctx) => {
      return res(ctx.status(500)); // Devolver 500
    })
  );

  const rendered = renderWithClient(<Blog />);

  // Esperar el estado de carga inicial
  expect(await rendered.findByText("...")).toBeInTheDocument();
  // Verificar el mensaje de error
  expect(await rendered.findByText(/Error fetching data/)).toBeInTheDocument();
});


Ahora, solo para esta prueba, nuestra solicitud al endpoint articles devolverá un código de estado 500 y, dado que hemos desactivado los reintentos, deberíamos poder ver el texto de error inmediatamente después del estado de carga.

Ahora, MSW es una herramienta fantástica para mockear el comportamiento de la API, pero a veces, no hay una API de red que mockear.

Por ejemplo, ¿qué pasaría si tuviéramos una aplicación que utilizara la API navigator.mediaDevices.enumerateDevices para enumerar cuántos dispositivos multimedia tienes en tu máquina?


import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'

function MediaDevices() {
  const { data, status } = useQuery({
    queryKey: ['mediaDevices'],
    queryFn: async () => {
      return navigator.mediaDevices.enumerateDevices()
    }
  })

  if (status === 'pending') {
    return <div>...</div>
  }

  if (status === 'error') {
    return <div>We can't access your media devices</div>
  }

  return (
    <div>You have { data.length } media devices</div>
  )
}

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MediaDevices />
    </QueryClientProvider>
  )
}


Dado que esta API no obtiene datos a través de la red, no podemos usar MSW para mockearla, pero debido a que la API mediaDevices es asíncrona, todavía tiene sentido usarla con React Query.

Hay tres enfoques diferentes que puedes tomar para resolver esto.

1. Mockear la QueryFunction
Como primer intento, podrías mockear lo que hace la queryFn.

Para enumerar dispositivos multimedia, puedes simplemente sobrescribir lo que devuelve enumerateDevices (y no olvides restablecer el mock entre pruebas):


const original = global.navigator.mediaDevices?.enumerateDevices;

describe("MediaDevices", () => {
  afterEach(() => {
    // Restablecer el mock
    Object.defineProperty(global.navigator, "mediaDevices", {
      value: {
        enumerateDevices: original,
      },
    });
  });
  test("successful query", async () => {
    // Definir el mock para esta prueba
    Object.defineProperty(global.navigator, "mediaDevices", {
      configurable: true,
      value: {
        enumerateDevices: () =>
          Promise.resolve([
            { deviceId: "id1", label: "label1" },
            { deviceId: "id2", label: "label1" },
          ]),
      },
    });
  });
});


A partir de ahí, puedes simplemente renderizar el componente y afirmar que hay dos dispositivos.


const rendered = renderWithClient(<MediaDevices />);

expect(await rendered.findByText("...")).toBeInTheDocument();
expect(
  await rendered.findByText("You have 2 media devices")
).toBeInTheDocument();


2. Sembrar la QueryCache (Seed)
El segundo enfoque es rellenar la QueryCache con datos por adelantado para nuestra prueba específica, y establecer un staleTime alto para que no se produzcan re-obtenciones.

En este enfoque, dado que hay datos en la caché, la queryFn nunca se ejecutará. Eso puede ser algo bueno (si es difícil de mockear), pero también significa que si algo está mal en la implementación de queryFn, tu prueba no lo detectará.

Como sabes, para ingresar datos manualmente en la caché puedes llamar a queryClient.setQueryData, pero asegúrate de llamarlo antes de renderizar el componente.

Esta es una buena oportunidad para actualizar nuestra abstracción renderWithClient.


function renderWithClient(ui, data = []) {
  const testQueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity, // Establecer un staleTime infinito para evitar refetch
      }
    }
  });

  // Iterar sobre los datos y sembrar la caché
  data.forEach(([queryKey, data]) => {
    testQueryClient.setQueryData(queryKey, data)
  })

  return render(
    <QueryClientProvider client={testQueryClient}>
      {ui}
    </QueryClientProvider>
  );
}


Luego puedes pasar tus datos iniciales a renderWithClient para que entren en la QueryCache por adelantado.


const rendered = renderWithClient(<MediaDevices />, [
  [
    ["mediaDevices"],
    [
      { deviceId: "id1", label: "label1" },
      { deviceId: "id2", label: "label2" },
    ],
  ],
]);


También es importante saber que en este caso, nuestra Query nunca estará en un estado pending, por lo que no podrás afirmar que se muestre el estado de carga.


test("query with data seeded", async () => {
  const rendered = renderWithClient(<MediaDevices />, [
    [
      ["mediaDevices"],
      [
        { deviceId: "id1", label: "label1" },
        { deviceId: "id2", label: "label2" },
      ],
    ],
  ]);

  // Se renderiza inmediatamente sin estado pending
  expect(
    await rendered.findByText("You have 2 media devices")
  ).toBeInTheDocument();
});


3. Mockear useQuery
No recomendamos esto, pero queríamos incluirlo como una opción de "último recurso", y la solución real depende de tu framework de pruebas.

Aquí hay un ejemplo funcional de cómo hacerlo en jest:


jest.mock("@tanstack/react-query", () => {
  return {
    ...jest.requireActual("@tanstack/react-query"),
    useQuery: () => {
      return {
        status: "success",
        data: [
          { deviceId: "id1", label: "label1" },
          { deviceId: "id2", label: "label2" },
        ],
      };
    },
  };
});


La parte clave es que tienes que requerir el módulo real cuando mockeas el módulo completo @tanstack/react-query, ya que hay otras cosas aparte de useQuery dentro de él, como el QueryClient mismo.

Si no hiciéramos eso, terminaríamos con un error:

TypeError: _reactQuery.QueryClient is not a constructor

También es bastante tedioso devolver un QueryResult completo.

En el ejemplo anterior, solo hemos incluido los campos que estamos usando actualmente (status y data). Esto significa que nuestra prueba es frágil y puede romperse si elegimos usar un campo adicional proporcionado por useQuery, como isFetching.

Por lo tanto, la recomendación es favorecer el uso de una de las otras opciones.

Ahora que hemos cubierto las Queries y cómo probarlas, es hora de echar un vistazo a su contraparte: las Mutations.

Para esto, usemos nuestra aplicación de lista de tareas pendientes con la que trabajamos en la lección de mutaciones. Como recordatorio, aquí es donde lo dejamos: cada vez que agregamos una nueva tarea pendiente, invalidamos la query todos/list.


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


En términos generales, probar Mutations sigue los mismos principios que probar Queries: mockeas la solicitud de API y afirmas que el componente se comporta como se espera. Por lo tanto, un lugar natural para comenzar es mockear nuestros endpoints.

Primero, de manera similar a lo que vimos en el ejemplo anterior, vamos a crear uno para nuestra solicitud GET a /todos/list:


const handlers = [
  rest.get("/todos/list", (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        { id: "1", title: "Learn JavaScript", done: true },
        { id: "2", title: "Go shopping", done: false },
      ])
    );
  }),
];


Ahora, cada vez que ejecutemos nuestras pruebas y nuestra aplicación realice una solicitud al endpoint /todos/list, obtendrá la lista de tareas pendientes que hemos definido en nuestro handler.

Ahora queremos mockear la mutación que ocurre cuando se realiza una solicitud POST a /todos/add.


const handlers = [
  rest.get("/todos/list", (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        { id: "1", title: "Learn JavaScript", done: true },
        { id: "2", title: "Go shopping", done: false },
      ])
    );
  }),
  rest.post("/todos/add", (req, res, ctx) => {
    const { name } = req.body
    return res(
      ctx.status(200),
      ctx.json({ id: "3", title: name, done: false })
    );
  }),
];


Observarás que la API es muy similar a nuestro handler GET, pero ahora estamos usando rest.post y devolviendo la invocación res.

Técnicamente, no necesitamos devolver un nuevo elemento TODO en la respuesta, ya que de todos modos solo estamos invalidando la query, pero es bueno saber que es una opción si tienes una API que devuelve el nuevo elemento y necesitas imitar ese comportamiento.

A continuación, toca escribir nuestra prueba.

Tu primera intuición puede ser hacer algo como esto, donde pruebas que cualquier entrada ingresada en el campo de entrada se agregará a la lista de tareas pendientes.


const server = setupServer(...handlers);

// Establecer el mockeo de API antes de todas las pruebas.
beforeAll(() => server.listen());
// Restablecer cualquier manejador de solicitudes que podamos añadir durante las pruebas,
// para que no afecten a otras pruebas.
afterEach(() => server.resetHandlers());
// Limpiar después de que las pruebas hayan finalizado.
afterAll(() => server.close());

describe("TodoList", () => {
  test("successful mutation", async () => {
    const rendered = renderWithClient(<TodoList />);

    // 1. Verificar la lista inicial
    expect(await rendered.findByText("...")).toBeInTheDocument();
    expect(await rendered.findByText(/learn javascript/i)).toBeInTheDocument();
    expect(await rendered.findByText(/go shopping/i)).toBeInTheDocument();

    const input = rendered.getByRole("textbox", { name: /add:/i });

    // 2. Ingresar la nueva tarea
    fireEvent.change(input, {
      target: { value: "Learn TypeScript" },
    });

    // 3. Enviar la mutación (POST)
    fireEvent.submit(input);

    // 4. Afirmar que la nueva tarea aparece en la lista
    expect(await rendered.findByText(/Learn TypeScript/i)).toBeInTheDocument();
  });
});


Esta es la idea correcta, pero hay un gran problema. Si ejecutas esta prueba tal como está, obtendrías este error:

Unable to find an element with the text: /learn typescript/i.

Si miras los mock handlers que creamos, notarás que son estáticos.

Tal como está, cada solicitud a /todos/list siempre devolverá las mismas dos entradas ("Learn JavaScript" y "Go Shopping"). Eso significa que incluso si realizamos una "actualización", seguiremos obteniendo esas mismas dos entradas.

Sin embargo, debido a que estamos invalidando la query en onSuccess, confiamos en el hecho de que hacer una nueva solicitud al servidor producirá los datos más recientes y precisos. Claramente eso no está sucediendo aquí.

Una solución a este problema sería configurar una base de datos mock y realizar actualizaciones reales en ella, pero obviamente eso es mucho trabajo y nueva complejidad de gestionar.

En cambio, MSW proporciona una opción de anulación por única vez (one-time override) que puedes configurar para representar con mayor precisión una "mutación" en tu aplicación.


test("successful mutation with invalidation", async () => {
  const [rendered] = renderWithClient(<TodoList />);

  expect(await rendered.findByText("...")).toBeInTheDocument();
  expect(await rendered.findByText(/learn javascript/i)).toBeInTheDocument();
  expect(await rendered.findByText(/go shopping/i)).toBeInTheDocument();

  const input = rendered.getByRole("textbox", { name: /add:/i });

  fireEvent.change(input, {
      target: { value: "Learn TypeScript" },
    });
  
  // ANULACIÓN POR ÚNICA VEZ con MSW:
  // Decimos que la próxima vez que se llame a /todos/list,
  // debe devolver la lista con la nueva tarea ("Learn TypeScript").
  server.use(
    rest.get("/todos/list", (req, res, ctx) => {
      return res.once( // <-- Usar res.once para que solo afecte la próxima llamada GET
        ctx.status(200),
        ctx.json([
          { id: "1", title: "Learn JavaScript", done: true },
          { id: "2", title: "Go shopping", done: false },
          { id: "3", title: "Learn TypeScript", done: false }, // <-- La nueva tarea
        ])
      );
    })
  );

  fireEvent.submit(input); // Esto desencadena la Mutación (POST) seguida de la invalidación (GET)

  // La afirmación ahora pasa porque el GET subsiguiente devuelve la lista actualizada.
  expect(await rendered.findByText(/Learn TypeScript/i)).toBeInTheDocument();
});


Ahora, antes de enviar nuestro formulario, instruimos a MSW para que devuelva una lista que contendrá nuestro elemento recién agregado, asegurando que nuestra afirmación original pase y que la invalidación de la query funcione como se espera.


https://mswjs.io/docs/api/setup-server/use#one-time-override

Faltan las Secciones: BONUS TIME