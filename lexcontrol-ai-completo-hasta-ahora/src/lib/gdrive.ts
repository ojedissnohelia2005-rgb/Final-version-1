import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, User } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase App
const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

let cachedAccessToken: string | null = null;
let currentAuthorizedUser: User | null = null;

/**
 * Initiates the Google Sign-In popup with the full Google Drive scope.
 */
export async function connectGoogleDrive(): Promise<{ user: User; accessToken: string }> {
  const provider = new GoogleAuthProvider();
  // Request full permissive scope or drive.file as requested
  provider.addScope("https://www.googleapis.com/auth/drive");
  provider.addScope("https://www.googleapis.com/auth/drive.file");
  
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("No se pudo obtener el token de acceso de Google Drive.");
    }
    cachedAccessToken = credential.accessToken;
    currentAuthorizedUser = result.user;
    return { user: result.user, accessToken: credential.accessToken };
  } catch (error) {
    console.error("Error during Google Drive auth", error);
    throw error;
  }
}

export function getCachedToken(): string | null {
  return cachedAccessToken;
}

export function setCachedToken(token: string | null) {
  cachedAccessToken = token;
}

export function getAuthUser(): User | null {
  return currentAuthorizedUser || auth.currentUser;
}

/**
 * Searches for a folder by name on Google Drive, optionally under a specific parent folder.
 */
export async function findFolder(name: string, accessToken: string, parentId?: string): Promise<string | null> {
  let query = `name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }
  
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!res.ok) {
      throw new Error(`Error buscando carpeta: ${res.statusText}`);
    }
    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
    return null;
  } catch (err) {
    console.error(`Error in findFolder (${name}):`, err);
    return null;
  }
}

/**
 * Creates a folder on Google Drive, optionally under a specific parent folder.
 */
export async function createFolder(name: string, accessToken: string, parentId?: string): Promise<string> {
  const url = "https://www.googleapis.com/drive/v3/files";
  const body: any = {
    name: name,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentId) {
    body.parents = [parentId];
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`Error creando carpeta: ${res.statusText}`);
    }
    const data = await res.json();
    return data.id;
  } catch (err) {
    console.error(`Error in createFolder (${name}):`, err);
    throw err;
  }
}

/**
 * Gets or creates a folder on Google Drive.
 */
export async function getOrCreateFolder(name: string, accessToken: string, parentId?: string): Promise<string> {
  const existingId = await findFolder(name, accessToken, parentId);
  if (existingId) {
    return existingId;
  }
  return await createFolder(name, accessToken, parentId);
}

/**
 * Uploads/Registers a plain text document (or other files) into a Google Drive folder.
 * If file with same name exists, overwrites it.
 */
export async function uploadOrOverwriteTextFile(
  filename: string,
  content: string,
  parentFolderId: string,
  accessToken: string
): Promise<string> {
  // 1. Search for existing file
  const query = `name = '${filename.replace(/'/g, "\\'")}' and '${parentFolderId}' in parents and trashed = false`;
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`;
  
  let existingFileId: string | null = null;
  try {
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        existingFileId = searchData.files[0].id;
      }
    }
  } catch (err) {
    console.warn("Error searching for existing file on Drive", err);
  }

  // 2. Perform multipart upload
  const boundary = "lexcontrol_drive_sync_boundary";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  const metadata: any = {
    name: filename,
    mimeType: "text/plain",
  };

  if (!existingFileId) {
    metadata.parents = [parentFolderId];
  }

  const multipartRequestBody =
    delimiter +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) +
    delimiter +
    "Content-Type: text/plain; charset=UTF-8\r\n\r\n" +
    content +
    closeDelim;

  const url = existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
    : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";

  const method = existingFileId ? "PATCH" : "POST";

  const res = await fetch(url, {
    method: method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!res.ok) {
    throw new Error(`Error subiendo archivo '${filename}': ${res.statusText}`);
  }

  const result = await res.json();
  return result.id;
}
