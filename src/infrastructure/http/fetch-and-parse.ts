export async function fetchAndParse<T>(
  res: Response,
  guard: (data: unknown) => data is T,
  errorMessage: string,
): Promise<T> {
  const json = await res.json();

  if (!guard(json)) {
    throw new Error(errorMessage);
  }

  return json;
}
