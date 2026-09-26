export const metadata = {
  title: "ARES",
  description: "Просмотр и апрув видео для клиентов и креаторов",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif", background: "#F6F5F1", color: "#15161B" }}>
        {children}
      </body>
    </html>
  );
}
