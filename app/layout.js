import '../src/style.css';

export const metadata = {
  title: 'Slither Arena',
  description: 'Entre na arena multiplayer, colete orbes e dispute o topo do ranking.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
