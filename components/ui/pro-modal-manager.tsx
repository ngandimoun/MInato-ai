"use client";

import React, { useState, useEffect } from "react";
import { ProPlanModal } from "./pro-plan-modal";

export function ProModalManager() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const handleOpenProModal = () => {
      setIsModalOpen(true);
    };

    // Écouter l'événement pour ouvrir le modal
    window.addEventListener('open-pro-modal', handleOpenProModal);

    return () => {
      window.removeEventListener('open-pro-modal', handleOpenProModal);
    };
  }, []);

  const handleClose = () => {
    setIsModalOpen(false);
  };

  return (
    <ProPlanModal
      isOpen={isModalOpen}
      onClose={handleClose}
    />
  );
} 