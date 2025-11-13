// En este desafío, vamos a revisitar la experiencia de prestar un libro. Queremos que este proceso se sienta instantáneo al actualizar la interfaz de usuario tan pronto como el usuario haga clic en el botón "Prestar" (Check Out).

// Tu trabajo es refactorizar el código para implementar actualizaciones optimistas (optimistic updates). Para lograr esto, necesitarás conocer la estructura de los datos que nuestra UI de libros está esperando:

// interface Book {
//   id: string;
//   title: string;
//   authors: Array<string>;
//   publisher: string;
//   publishedDate: string;
//   description: string;
//   thumbnail: string;
//   previewLink: string;
//   averageRating: number;
//   availableCopies: 0 | 1 | 2 | 3 | 4 | 5;
//   isCheckedOutByUser: boolean; // Indica si el usuario actual tiene el libro prestado
// }

// 🎯 Tareas de Implementación:

// Cuando un usuario haga clic en el botón "Prestar" (Check Out), la UI debe actualizarse inmediatamente para reflejar el cambio.

// El libro debe aparecer de inmediato en la sección "Mis Libros" de la UI.

// Si hay un error al prestar el libro, la UI debe revertirse a su estado original.

// En cualquier caso (éxito o error), invalidar las queries para obtener el estado más reciente del servidor después de la solicitud.

// Si un usuario hace clic en el botón "Devolver" (Return), la UI debe actualizarse inmediatamente para reflejar el cambio.

// El libro debe eliminarse de inmediato de la sección "Mis Libros" de la UI.

// Si hay un error al devolver el libro, la UI debe revertirse a su estado original.

// En cualquier caso, invalidar las queries para obtener el estado más reciente del servidor después de la solicitud.