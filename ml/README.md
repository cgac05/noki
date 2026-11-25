# Modelo de riesgo de inasistencia

Desde la raíz del repositorio, ejecuta `node --import tsx ml/entrenar.ts`.
El entrenamiento genera 6000 citas sintéticas con semilla `20261125`, separa
80 % para entrenamiento y 20 % para validación, y escribe el modelo y las
métricas AUC y Brier de la regresión logística y de las reglas.

Los datos y las métricas son sintéticos. El modelo demuestra el mecanismo de
estimación y no ha sido validado con citas de pacientes reales.
