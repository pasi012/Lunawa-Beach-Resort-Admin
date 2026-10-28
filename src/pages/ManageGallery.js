import { useEffect, useState } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    serverTimestamp,
    orderBy,
    query,
} from "firebase/firestore";

import {
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject,
} from "firebase/storage";

import { db, storage } from "../firebase";

import aboutHero from "../assets/hero.jpg";

function ManageGallery() {
    const [images, setImages] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [progressText, setProgressText] = useState("");

    useEffect(() => {
        AOS.init({ duration: 900, once: true });
        fetchImages();
    }, []);

    // ================= FETCH IMAGES =================
    const fetchImages = async () => {
        try {
            const q = query(
                collection(db, "gallery"),
                orderBy("createdAt", "desc")
            );
            const snapshot = await getDocs(q);

            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));

            setImages(data);
        } catch (error) {
            console.error("Error fetching images:", error);
        }
    };

    // ================= MULTIPLE UPLOAD =================
    const handleUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploading(true);
        setProgressText(`Uploading 0 / ${files.length}`);

        try {
            let uploadedCount = 0;

            for (const file of files) {
                const storageRef = ref(
                    storage,
                    `gallery/${Date.now()}-${file.name}`
                );

                await uploadBytes(storageRef, file);
                const downloadURL = await getDownloadURL(storageRef);

                await addDoc(collection(db, "gallery"), {
                    imageUrl: downloadURL,
                    storagePath: storageRef.fullPath,
                    createdAt: serverTimestamp(),
                });

                uploadedCount++;
                setProgressText(`Uploading ${uploadedCount} / ${files.length}`);
            }

            fetchImages();
        } catch (error) {
            console.error("Upload failed:", error);
            alert("One or more uploads failed");
        } finally {
            setUploading(false);
            setProgressText("");
            e.target.value = "";
        }
    };

    // ================= DELETE IMAGE =================
    const handleDelete = async (id, storagePath) => {
        if (!window.confirm("Delete this image?")) return;

        try {
            await deleteObject(ref(storage, storagePath));
            await deleteDoc(doc(db, "gallery", id));
            fetchImages();
        } catch (error) {
            console.error("Delete failed:", error);
            alert("Delete failed");
        }
    };

    return (
        <div className="w-full overflow-hidden">
            {/* ================= HERO ================= */}
            <section className="relative h-[40vh] w-full">
                <img
                    src={aboutHero}
                    alt="Manage Gallery"
                    className="absolute inset-0 w-full h-full object-fill"
                />
                <div className="absolute inset-0 bg-black/60" />
                
            </section>

            {/* ================= UPLOAD ================= */}
            <section className="py-10 bg-gray-100">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <h2 className="text-2xl font-bold mb-4">
                        Upload Images
                    </h2>

                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleUpload}
                        disabled={uploading}
                        className="block mx-auto mb-4"
                    />

                    {uploading && (
                        <p className="text-orange-600 font-medium">
                            {progressText}
                        </p>
                    )}
                </div>
            </section>

            {/* ================= GRID ================= */}
            <section className="py-12 bg-white">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {images.map((img, index) => (
                            <div
                                key={img.id}
                                data-aos="zoom-in"
                                data-aos-delay={index * 80}
                                className="relative rounded-xl overflow-hidden shadow-lg"
                            >
                                <img
                                    src={img.imageUrl}
                                    alt="Gallery"
                                    className="w-full h-[250px] object-cover"
                                />

                                <button
                                    onClick={() =>
                                        handleDelete(img.id, img.storagePath)
                                    }
                                    className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 text-sm rounded hover:bg-red-700 transition"
                                >
                                    Delete
                                </button>
                            </div>
                        ))}
                    </div>

                    {images.length === 0 && (
                        <p className="text-center text-gray-500 mt-10">
                            No images uploaded yet.
                        </p>
                    )}
                </div>
            </section>
        </div>
    );
}

export default ManageGallery;
