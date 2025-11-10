// En este desafío, nuestro objetivo es implementar una función de scroll infinito para nuestra aplicación. Para lograrlo, necesitaremos algunas cosas diferentes. Primero, hemos preparado un hook useInView. Este hook nos permite detectar cuándo un elemento es visible en un contenedor de desplazamiento y nos proporciona un callback onChange que podemos usar para activar la solicitud de datos.

// const rootRef = React.useRef(null);

// const { ref } = useInView({
//   threshold: 0,
//   root: rootRef.current,
//   rootMargin: "40px",
//   onChange: (inView) => {
//    puedes manejar la solicitud de datos aquí
//   },
// });

// adjunta la ref al elemento que queremos observar

// <ol ref={rootRef}>
//   <li ref={ref} />
// </ol>;

// Nuestro endpoint de la API devuelve un objeto que tiene el siguiente aspecto:


// {
//   activities: Array(10), // Un array de actividades
//   currentPage: 1,       // La página actual
//   totalPages: 12,       // El número total de páginas disponibles
//   totalItems: 116,      // El número total de elementos
// }

// Hemos creado una función getActivity que recibe un argumento page y devuelve los datos de la API.

// Tareas

// Solicita la primera página de datos cuando el componente se monte.

// Renderiza las actividades en el feed de actividades.

// Adjunta un elemento al final de la lista con la ref devuelta por useInView si tenemos más páginas.

// Si ese elemento se vuelve visible, solicita la página siguiente de datos.

// Muestra el componente <NoMoreActivities /> si no hay más páginas.