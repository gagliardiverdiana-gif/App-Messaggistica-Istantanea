const API_URL = "http://localhost:5000/api";

const parseResponse = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMessage =
      (isJson && data?.message) ||
      (!isJson && data) ||
      "Errore durante la richiesta";
    throw new Error(errorMessage);
  }

  return data;
};

export const createRegistrationRequest = async (requestData) => {
  const response = await fetch(`${API_URL}/registration-requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestData),
  });

  return await parseResponse(response);
};

export const login = async (loginData) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(loginData),
  });

  return await parseResponse(response);
};