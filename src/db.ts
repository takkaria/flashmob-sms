import massive from "massive";

export let instance: massive.Database;
export const setInstance = (inst: massive.Database) => (instance = inst);
export const init = async () => {
  const params: {
    connectionString: string;
    ssl?: { rejectUnauthorized: false };
  } = {
    connectionString: process.env["DATABASE_URL"] ?? "",
  };
  if ("DATABASE_SSL" in process.env) {
    params.ssl = { rejectUnauthorized: false };
  }
  // TypeScript types don't understand the rejectUnauthorized bit.
  // @ts-ignore
  return massive(params);
};
