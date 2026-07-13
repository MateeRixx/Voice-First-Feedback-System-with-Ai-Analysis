/// <reference types="vite/client" />
/// <reference types="@types/react" />
/// <reference types="@types/react-dom" />

declare module '*.css' {
  const content: string
  export default content
}