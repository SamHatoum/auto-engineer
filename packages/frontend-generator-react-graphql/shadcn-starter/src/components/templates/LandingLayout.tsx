export const LandingLayout = (props: { children: any }) => {
  const { children } = props;
  return (
    <main>
      <header>HEADER</header>
      {children}
      <footer>FOOTER</footer>
    </main>
  );
};
