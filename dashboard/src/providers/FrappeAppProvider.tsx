import { PropsWithChildren } from "react";
import { FrappeProvider } from "frappe-react-sdk";

export function FrappeAppProvider({ children }: PropsWithChildren) {
  return (
    <FrappeProvider
      url={import.meta.env.VITE_API_BASE_URL}
      enableSocket={false}
      swrConfig={{
        onError: async (error) => {
          //     if (error.httpStatus === 401) {
          //       toast.error("Session expired. Please log in again.");
          //   }
        },
      }}
    >
      {children}
    </FrappeProvider>
  );
}
