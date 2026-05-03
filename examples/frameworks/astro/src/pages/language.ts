import type { APIRoute } from "astro";

const ONE_YEAR = 60 * 60 * 24 * 365;

function getSafeRedirect(redirect: string | null, basePath: string) {
  if (!redirect?.startsWith("/")) {
    return basePath;
  }

  if (redirect.startsWith("//")) {
    return basePath;
  }

  return redirect;
}

export const GET: APIRoute = ({ cookies, redirect, url }) => {
  const basePath = import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  const language = url.searchParams.get("lang");
  const redirectTo = getSafeRedirect(url.searchParams.get("redirect"), basePath);

  if (language) {
    cookies.set("tradux_lang", language, {
      path: "/",
      maxAge: ONE_YEAR,
      sameSite: "lax",
    });
  }

  return redirect(redirectTo);
};
