import {
    ref,
    uploadBytes,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject
} from "firebase/storage";
import { storage } from "../firebase";

/* ------------------------------------------
   1. Upload file and return download URL
------------------------------------------- */
export async function uploadFile(folderName, file) {
    const fileRef = ref(storage, `${folderName}/${Date.now()}_${file.name}`);

    // Upload
    await uploadBytes(fileRef, file);

    // Get URL
    const url = await getDownloadURL(fileRef);

    return {
        url,
        path: fileRef.fullPath, // useful for delete
    };
}

/* ------------------------------------------
   2. Upload file with progress callback
------------------------------------------- */
export function uploadFileWithProgress(folderName, file, progressCallback) {
    const fileRef = ref(storage, `${folderName}/${Date.now()}_${file.name}`);

    const uploadTask = uploadBytesResumable(fileRef, file);

    uploadTask.on("state_changed", (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        progressCallback(progress.toFixed(0)); // send progress %
    });

    return new Promise((resolve, reject) => {
        uploadTask.on(
            "state_changed",
            null,
            reject,
            async () => {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                resolve({
                    url,
                    path: uploadTask.snapshot.ref.fullPath,
                });
            }
        );
    });
}

/* ------------------------------------------
   3. Upload multiple files
------------------------------------------- */
export async function uploadMultiple(folderName, files) {
    const results = [];

    for (const file of files) {
        const uploaded = await uploadFile(folderName, file);
        results.push(uploaded);
    }

    return results;
}

/* ------------------------------------------
   4. Delete file by path
------------------------------------------- */
export async function deleteFile(path) {
    const fileRef = ref(storage, path);
    await deleteObject(fileRef);
    return true;
}
