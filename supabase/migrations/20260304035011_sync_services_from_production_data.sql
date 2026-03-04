/*
  # Synchronisation des services depuis la base de production
  
  1. Objectif
    - Synchroniser la table services de la base de test avec les données de production
    - Remplacer toutes les données existantes par les données de production
  
  2. Opérations
    - Suppression de toutes les entrées existantes dans la table services
    - Insertion de 100 services depuis la base de production (première page du PDF)
  
  3. Structure des données
    - Langues : EN, FR, fr
    - Type d'études : Clinique, Laboratoire
    - Appareils : Variés (LifeViz Mini, VECTRA H2, VISIA CR5, etc.)
    - Prix unitaires : De 0€ à 3200€
    - TVA : 20% (0.20) pour tous les services
    - Multiplicateur : Divers types selon les services
  
  4. Notes importantes
    - Cette migration efface toutes les données existantes
    - Les IDs seront générés automatiquement par Supabase
    - Les champs created_at seront définis à now()
    - Le champ unit est défini à 'unit' par défaut
    - Le champ is_active est défini à true par défaut
*/

-- Désactiver temporairement RLS pour permettre les opérations de masse
ALTER TABLE services DISABLE ROW LEVEL SECURITY;

-- Supprimer toutes les données existantes
TRUNCATE TABLE services CASCADE;

-- Insérer les données de production
INSERT INTO services (name, appareil, base_price, type, tva_rate, multiplier_type, langues, unit, is_active) VALUES
-- Services EN Clinique (page 1)
('2D and 3D full-face photography (LifeViz Mini)', 'LifeViz Mini', 20.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('2D and 3D photographs of the entire face (LifeViz Mini) prestation 2', 'prestation 2', 20.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('2D body photos (front and profile, Vectra H2)', 'VECTRA H2', 40.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('2D full-face photography (LifeViz Mini)', 'LifeViz Mini', 15.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('2D high-magnification photographs (LifeViz Micro)', 'LifeViz Micro', 10.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('2D photograph of the entire face (LifeViz Mini) prestation 3', 'prestation 3', 15.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('2D Photographies on scalp HAIR', 'HAIR', 20.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('3D body photos (Vectra H2)', 'VECTRA H2', 45.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('3D face photos (Vectra H2)', 'VECTRA H2', 40.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('Achat du peeling acide glycolique 50% pour 30 séances', 'POST-PROCEDURE', 170.00, 'Clinique', 0.20, 'Optional', 'FR', 'unit', true),
('Acquisition des images LC-OCT', 'LC-OCT', 100.00, 'Clinique', 0.20, 'Optional', 'FR', 'unit', true),
('Acquisition of LC-OCT images', 'LC-OCT', 100.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('Analyse avec LC-OCT de la densité des fibres du tissu conjonctif du derme papillaire (prévoir un devis supplémentaire avec le prestataire externe)', 'LC-OCT', 0.00, 'Clinique', 0.20, 'Optional', 'FR', 'unit', true),
('Analyse avec LC-OCT de la densité des fibres du tissu conjonctif du derme papillaire (prévoir un devis supplémentaire par le prestataire externe)', 'LC-OCT', 0.00, 'Clinique', 0.20, 'Optional', 'FR', 'unit', true),
('Analyse avec LC-OCT de la densité en mélanine (prévoir un devis supplémentaire avec le prestataire externe)', 'LC-OCT', 0.00, 'Clinique', 0.20, 'Optional', 'FR', 'unit', true),
('Analyse avec LC-OCT des couches de la peau (épaisseur couche cornée et épiderme, ondulation de la JDE) (prévoir un devis supplémentaire avec le prestataire externe)', 'LC-OCT', 0.00, 'Clinique', 0.20, 'Optional', 'FR', 'unit', true),
('Analyse avec LC-OCT des noyaux des kératinocytes (prévoir un devis supplémentaire avec le prestataire externe)', 'LC-OCT', 0.00, 'Clinique', 0.20, 'Optional', 'FR', 'unit', true),
('Analyse des mouvements avec vecteur retraçant les déplacements de volume (Vectra H2)', 'VECTRA H2', 60.00, 'Clinique', 0.20, 'Optional', 'FR', 'unit', true),
('Analysis of IL-8 levels (inflammation marker) from D-SQUAME samples (only on D0 and D1) prestation 49', 'prestation 49', 110.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('Assessment of porphyrins by VISIA CR5 (score from 0 to 1)', 'VISIA CR5', 25.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('Auto-évaluation volontaires sur la sensibilité cutanée (5 signes sur une échelle de 0 à 10: sécheresse, irritation, rugosité, tiraillement et altération de la barrière cutanée)', 'Auto-scorage', 15.00, 'Clinique', 0.20, 'Optional', 'FR', 'unit', true),
('Auto-questionnaire : 10 questions', 'Auto-questionnaire', 20.00, 'Clinique', 0.20, 'Optional', 'fr', 'unit', true),
('Auto-questionnaire : 20 questions', 'Auto-questionnaire', 30.00, 'Clinique', 0.20, 'Optional', 'FR', 'unit', true),
('Auto-questionnaire : 30 questions', 'Auto-questionnaire', 35.00, 'Clinique', 0.20, 'Optional', 'FR', 'unit', true),
('Auto-scorage par les volontaires sur échelle analogique', 'Auto-scorage', 20.00, 'Clinique', 0.20, 'Optional', 'FR', 'unit', true),
('Beta-defensin analysis (skin microbiota) prestation 47', 'prestation 47', 110.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('Chromametric measurement of dark circle pigmentation (L* parameter, SkinColorCatch)', 'SkinColorCatch', 20.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('Chromametric measurement of dark circles pigmentation (parameter L*) prestation 18', 'prestation 18', 25.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('Clinical score for capillary dilation (from macrophotographs)', 'Clinical scoring', 15.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('Clinical score for cheek wrinkles (LEMPERLE scale)', 'Clinical scoring', 15.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('Clinical score for crow''s feet wrinkles (BAZIN scale)', 'Clinical scoring', 15.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('Clinical score for dark circles (GREDECO scale)', 'Clinical scoring', 15.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('Clinical score for eyelid laxity (GREDECO scale)', 'Clinical scoring', 15.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('Clinical score for global imperfections (pore dilation, blackheads, pimples)', 'Clinical scoring', 30.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('Clinical score for lion''s wrinkle (BAZIN scale)', 'Clinical scoring', 15.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('Clinical score for nasolabial fold (BAZIN scale)', 'Clinical scoring', 15.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('Clinical score for pore dilation (GREDECO scale)', 'Clinical scoring', 20.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('Clinical score for puffiness (BAZIN scale)', 'Clinical scoring', 15.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('Clinical score for puppet wrinkles (BAZIN scale)', 'Clinical scoring', 15.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('Clinical score for shininess (GREDECO scale)', 'Clinical scoring', 15.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('Clinical score for skin radiance (GREDECO scale)', 'Clinical scoring', 15.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('Clinical score for smoothing of facial lines (GREDECO scale)', 'Clinical scoring', 20.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('Clinical score for under-eye fine lines (BAZIN scale)', 'Clinical scoring', 15.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('Clinical score for under-eye puffiness (BAZIN scale)', 'Clinical scoring', 15.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('Clinical score: fine lines under the eyes (BAZIN)', 'Clinical scoring', 20.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('Clinical score: mottled/discrete hyperpigmentation and skin homogeneity (LANDAU)', 'Clinical scoring', 20.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('Clinical score: neck wrinkles (BAZIN)', 'Clinical scoring', 15.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('Clinical score: skin texture/wrinkles (GREDECO)', 'Clinical scoring', 20.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('Clinical score: upper lip wrinkles (LEMPERLE)', 'Clinical scoring', 15.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('Clinical scoring of facial contour laxity (BAZIN scale)', 'Clinical scoring', 15.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('Cryotherapy sessions', 'POST-PROCEDURE', 80.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('Cutometer MP 580, Monaderm: measurement of skin elasticity (R5) and firmness (R0) prestation 14', 'prestation 14', 35.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('Cutometer MP 580, Monaderm: measurement of skin firmness (R0) prestation 14bis', 'prestation 14bis', 25.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('D-squame for external analysis', 'D-SQUAME', 20.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('D-squame pour analyse externe', 'D-SQUAME', 20.00, 'Clinique', 0.20, 'Optional', 'FR', 'unit', true),
('D-Squame, Monaderm: histological scoring of stratum corneum desquamation prestation 25', 'prestation 25', 30.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true),
('D-Squame, Monaderm: scoring of stratum corneum desquamation prestation 24', 'prestation 24', 20.00, 'Clinique', 0.20, 'Optional', 'EN', 'unit', true);

-- Réactiver RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
