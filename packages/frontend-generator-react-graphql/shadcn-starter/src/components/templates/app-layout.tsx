export const AppLayout = (props: { children: any }) => {
  const { children } = props;
  return (
    <main className="flex">
      <sidebar>SIDEBAR</sidebar>
      <section>{children}</section>
    </main>
  );
};
