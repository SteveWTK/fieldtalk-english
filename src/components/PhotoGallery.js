// src/components/PhotoGallery.js
import React, { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

const PhotoGallery = () => {
  const [selectedImage, setSelectedImage] = useState(null);

  const photos = [
    {
      id: 1,
      src: "/images/gallery/students-training-1.jpg",
      alt: "Alunos praticando vocabulário de futebol",
      caption: "Aula prática: aprendendo termos técnicos durante o treino",
    },
    {
      id: 2,
      src: "/images/gallery/classroom-interaction.jpg",
      alt: "Interação em sala de aula",
      caption: "Simulação de entrevista pós-jogo em inglês",
    },
    {
      id: 3,
      src: "/images/gallery/student-presentation.jpg",
      alt: "Aluno apresentando em inglês",
      caption: "Gabriel apresentando sua estratégia tática em inglês",
    },
    {
      id: 4,
      src: "/images/gallery/group-discussion.jpg",
      alt: "Discussão em grupo",
      caption: "Debate sobre liderança e comunicação em equipe",
    },
    {
      id: 5,
      src: "/images/gallery/teacher-student.jpg",
      alt: "Professor auxiliando aluno",
      caption: "Feedback personalizado com professor especializado",
    },
    {
      id: 6,
      src: "/images/gallery/graduation-ceremony.jpg",
      alt: "Cerimônia de formatura",
      caption: "Formatura da turma 2024 - prontos para a Europa!",
    },
  ];

  const openLightbox = (photo) => {
    setSelectedImage(photo);
  };

  const closeLightbox = () => {
    setSelectedImage(null);
  };

  const nextImage = () => {
    const currentIndex = photos.findIndex((p) => p.id === selectedImage.id);
    const nextIndex = (currentIndex + 1) % photos.length;
    setSelectedImage(photos[nextIndex]);
  };

  const prevImage = () => {
    const currentIndex = photos.findIndex((p) => p.id === selectedImage.id);
    const prevIndex = (currentIndex - 1 + photos.length) % photos.length;
    setSelectedImage(photos[prevIndex]);
  };

  return (
    <>
      {/* Gallery Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative group cursor-pointer overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-all duration-300"
            onClick={() => openLightbox(photo)}
          >
            <img
              src={photo.src}
              alt={photo.alt}
              className="w-full h-48 md:h-64 object-cover group-hover:scale-110 transition-transform duration-300"
              onError={(e) => {
                e.target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f3f4f6'/%3E%3Ctext x='200' y='140' text-anchor='middle' fill='%236b7280' font-size='14'%3E${photo.alt}%3C/text%3E%3Ctext x='200' y='160' text-anchor='middle' fill='%236b7280' font-size='10'%3EFieldTalk English%3C/text%3E%3C/svg%3E`;
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute bottom-4 left-4 text-white">
                <p className="text-sm font-medium">{photo.caption}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-full">
            {/* Close Button */}
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            >
              <X className="w-8 h-8" />
            </button>

            {/* Previous Button */}
            <button
              onClick={prevImage}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-10"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>

            {/* Next Button */}
            <button
              onClick={nextImage}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-10"
            >
              <ChevronRight className="w-8 h-8" />
            </button>

            {/* Image */}
            <img
              src={selectedImage.src}
              alt={selectedImage.alt}
              className="max-w-full max-h-full object-contain"
            />

            {/* Caption */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-6">
              <p className="text-white text-center">{selectedImage.caption}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PhotoGallery;
