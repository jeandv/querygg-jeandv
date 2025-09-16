import { useQuery } from "@tanstack/react-query"; // nota: las demas configuraciones de react-query son obvias, esto es solo ejemplo

async function getData() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        title: 'The Hobbit',
        authors: ['J.R.R. Tolkien'],
        thumbnail: 'https://ui.dev/images/courses/query/hobbit.jpg'
      });
    }, 1000);
  });
}

function Book() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['book'],
    queryFn: getData //<-- IMPORTANTE notar que no se ejecuta getData(), solo se pasa la referencia a la función
  });

// Al usar getData() con parentesis , estás ejecutando la función getData() de inmediato, en lugar de pasarla como una referencia para que useQuery la ejecute cuando sea necesario.
// Cuando llamas a una función con paréntesis (), JavaScript la ejecuta y devuelve su valor de retorno. En el caso de getData(), el valor de retorno es la promesa que crea.
// useQuery espera recibir una función (() => ...) que devuelva una promesa, no una promesa ya creada y en ejecución. Al pasarle la promesa de forma inmediata, 
// useQuery no puede manejar el ciclo de vida asíncrono, lo que provoca un error y hace que el estado de la consulta cambie a isError de inmediato.

  if (isPending) return <Loading />;

  if (isError) return <Error />;

  if (!data) return null

  return (
    <main className="book-detail">    
      <div>
        <span className="book-cover">
          <img src={data?.thumbnail} alt={data?.title} />
        </span>
      </div>
      <div>
        <h2 className="book-title">{data?.title}</h2>
        <small className="book-author">{data?.authors.join(", ")}</small>
      </div>
    </main>
  );
}

function Loading() {
  return <main>Loading...</main>;
}

function Error() {
  return <main>Woops there was an error...</main>;
}

export default function App() {
  return (
    <div>
      <header className="app-header">
        <h1>
          <span>Query Library</span>
        </h1>
      </header>
      <Book />
    </div>
  );
}