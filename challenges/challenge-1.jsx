// In this challenge, you'll be using the useQuery hook to return some mock data about a book. In order to do this, you'll need to set up a QueryClient and provide it to the App component.

// Tasks
// Make sure everything renders
// Set up the QueryClient and provide it to the App
// Create a query that returns the book title, "The Hobbit"

import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'


const queryClient = new QueryClient()
  
function Book() {
  
  const { data: book, isLoading, error } = useQuery({
    queryKey: ["book"],
    queryFn: () => Promise.resolve("The Hobbit")
  })
  
  return (
    <div>
      <header className="app-header">
        <h1>
          <span>Query Library</span>
        </h1>
      </header>
      <main>
        <h2 className="book-title">{book}</h2>
      </main>
    </div>
  );
}