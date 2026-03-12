-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 16-10-2025 a las 23:25:25
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `fastapi_bd`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `client_equipment`
--

CREATE TABLE `client_equipment` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `brand` varchar(100) NOT NULL,
  `capacity` varchar(50) DEFAULT NULL,
  `model` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  `status` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `modules`
--

CREATE TABLE `modules` (
  `id` int(11) NOT NULL,
  `name` varchar(50) DEFAULT NULL,
  `routes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`routes`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  `status` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `modules`
--

INSERT INTO `modules` (`id`, `name`, `routes`, `created_at`, `updated_at`, `deleted_at`, `status`) VALUES
(1, 'Servicios', '{\n  \"admin\": \"/users/admin/admin-services\",\n  \"technician\": \"/users/technician/technician-services\",\n  \"client\": \"/users/client/client-services\"\n}', '2025-10-16 05:15:35', '2025-10-16 05:24:49', NULL, 1),
(2, 'Reportes', '{\r\n  \"admin\": \"/users/admin/admin-reports\",\r\n  \"technician\": \"/users/technician/technician-reports\",\r\n  \"client\": \"/users/client/client-reports\"\r\n}', '2025-10-16 05:15:35', '2025-10-16 05:15:35', NULL, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `permissions`
--

CREATE TABLE `permissions` (
  `id` int(11) NOT NULL,
  `role_id` int(11) NOT NULL,
  `module_id` int(11) NOT NULL,
  `can_view` tinyint(1) DEFAULT 0,
  `can_create` tinyint(1) DEFAULT 0,
  `can_edit` tinyint(1) DEFAULT 0,
  `can_delete` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  `status` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `permissions`
--

INSERT INTO `permissions` (`id`, `role_id`, `module_id`, `can_view`, `can_create`, `can_edit`, `can_delete`, `created_at`, `updated_at`, `deleted_at`, `status`) VALUES
(1, 3, 1, 1, 1, 1, 1, '2025-10-13 22:42:32', '2025-10-16 06:11:04', NULL, 1),
(2, 3, 2, 1, 0, 0, 0, '2025-10-16 03:54:28', '2025-10-16 06:11:04', NULL, 1),
(3, 2, 1, 1, 0, 0, 0, '2025-10-16 04:00:12', '2025-10-16 06:17:34', NULL, 1),
(4, 2, 2, 0, 0, 0, 0, '2025-10-16 04:00:12', '2025-10-16 06:17:34', NULL, 1),
(5, 1, 1, 1, 1, 1, 1, '2025-10-16 05:48:24', '2025-10-16 05:48:29', NULL, 1),
(6, 1, 2, 1, 1, 1, 1, '2025-10-16 05:48:24', '2025-10-16 05:48:29', NULL, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `roles`
--

CREATE TABLE `roles` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  `status` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `roles`
--

INSERT INTO `roles` (`id`, `name`, `created_at`, `updated_at`, `deleted_at`, `status`) VALUES
(1, 'Administrador', '2025-10-08 00:56:29', '2025-10-08 00:56:29', NULL, 1),
(2, 'Técnico ', '2025-10-08 00:56:43', '2025-10-08 00:56:43', NULL, 1),
(3, 'Cliente', '2025-10-08 00:56:58', '2025-10-08 00:56:58', NULL, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `services`
--

CREATE TABLE `services` (
  `id` int(11) NOT NULL,
  `client_id` int(11) NOT NULL,
  `technician_id` int(11) DEFAULT NULL,
  `request_date` date DEFAULT curdate(),
  `request_time` time DEFAULT NULL,
  `service_type` varchar(50) NOT NULL,
  `address` varchar(255) NOT NULL,
  `current_status` varchar(50) DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  `status` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `services`
--

INSERT INTO `services` (`id`, `client_id`, `technician_id`, `request_date`, `request_time`, `service_type`, `address`, `current_status`, `created_at`, `updated_at`, `deleted_at`, `status`) VALUES
(1, 2, NULL, '2025-10-10', '16:11:00', 'Preventivo', 'Cra 2c #50-187', 'pending', '2025-10-10 23:50:39', '2025-10-13 21:22:11', NULL, 1),
(2, 2, NULL, '2025-10-16', '15:13:00', 'Correctivo', 'vvr55', 'pending', '2025-10-11 18:51:37', '2025-10-13 21:52:14', NULL, 1),
(3, 2, NULL, '2025-10-12', '14:50:00', 'Correctivo', 'hbtgfh', 'pending', '2025-10-12 19:47:48', '2025-10-16 03:27:32', '2025-10-13 21:56:55', 0);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `service_report`
--

CREATE TABLE `service_report` (
  `id` int(11) NOT NULL,
  `service_id` int(11) NOT NULL,
  `technician_id` int(11) NOT NULL,
  `service_description` text NOT NULL,
  `service_duration` char(10) DEFAULT NULL,
  `recommendation` varchar(80) DEFAULT NULL,
  `client_rating` tinyint(4) DEFAULT NULL,
  `client_comments` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  `status` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `last_name` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `document_number` varchar(255) DEFAULT NULL,
  `age` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `role_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  `status` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `users`
--

INSERT INTO `users` (`id`, `name`, `last_name`, `email`, `document_number`, `age`, `password`, `role_id`, `created_at`, `updated_at`, `deleted_at`, `status`) VALUES
(1, 'david', 'altamar', 'altamardavid8@gmail.com', '3105478987', '21', 'scrypt:32768:8:1$DHMQydnmYFNcyOjP$b3ad4d07eff6776695f1a77eebd3cd3fc3c2c863c19e1a33e6369ede2bf5e1ad2be00151456de7d331dac7513e3ce26d42895dd5e3b08dab2b65a7693f0276fa', 1, '2025-10-08 01:33:10', '2025-10-13 20:42:53', NULL, 1),
(2, 'David ', 'cliente', 'pruebasubemisor@gmail.com', '3105478987', '26', 'scrypt:32768:8:1$DHMQydnmYFNcyOjP$b3ad4d07eff6776695f1a77eebd3cd3fc3c2c863c19e1a33e6369ede2bf5e1ad2be00151456de7d331dac7513e3ce26d42895dd5e3b08dab2b65a7693f0276fa', 3, '2025-10-09 03:06:41', '2025-10-16 06:14:52', NULL, 1),
(3, 'r', 'a', 'a@gmail.com', '3105478987', '20', 'scrypt:32768:8:1$o7kmRoegFGUjBiu8$f5166d26f3686b75967102d907f6e7388421ed6fa5ca8dc9c786f6252d2553f2850003e41e7c2780b3043d77ebc22038595cf8ff681900dc169cdbc935b5cdc1', 3, '2025-10-09 23:47:09', '2025-10-09 23:47:09', NULL, 1),
(4, 'tecnico', 'david', 'tecnico@gmail.com', '3105478987', '23', 'scrypt:32768:8:1$xuca8rNpY51LJHdN$fd75656bec5afc7a1513bc8db2719043f33e3034b98307f04b8c9f146102cffabb0b425a0978768897b02ca5e6c2035a51dd749fa0840c13020215224a903754', 2, '2025-10-11 20:58:10', '2025-10-16 06:16:35', NULL, 1);

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `client_equipment`
--
ALTER TABLE `client_equipment`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indices de la tabla `modules`
--
ALTER TABLE `modules`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `role_id` (`role_id`),
  ADD KEY `module_id` (`module_id`);

--
-- Indices de la tabla `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `services`
--
ALTER TABLE `services`
  ADD PRIMARY KEY (`id`),
  ADD KEY `client_id` (`client_id`),
  ADD KEY `technician_id` (`technician_id`);

--
-- Indices de la tabla `service_report`
--
ALTER TABLE `service_report`
  ADD PRIMARY KEY (`id`),
  ADD KEY `service_id` (`service_id`),
  ADD KEY `technician_id` (`technician_id`);

--
-- Indices de la tabla `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD KEY `role_id` (`role_id`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `client_equipment`
--
ALTER TABLE `client_equipment`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `modules`
--
ALTER TABLE `modules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `permissions`
--
ALTER TABLE `permissions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `services`
--
ALTER TABLE `services`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `service_report`
--
ALTER TABLE `service_report`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `client_equipment`
--
ALTER TABLE `client_equipment`
  ADD CONSTRAINT `client_equipment_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Filtros para la tabla `permissions`
--
ALTER TABLE `permissions`
  ADD CONSTRAINT `permissions_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`),
  ADD CONSTRAINT `permissions_ibfk_2` FOREIGN KEY (`module_id`) REFERENCES `modules` (`id`);

--
-- Filtros para la tabla `services`
--
ALTER TABLE `services`
  ADD CONSTRAINT `services_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `services_ibfk_2` FOREIGN KEY (`technician_id`) REFERENCES `users` (`id`);

--
-- Filtros para la tabla `service_report`
--
ALTER TABLE `service_report`
  ADD CONSTRAINT `service_report_ibfk_1` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`),
  ADD CONSTRAINT `service_report_ibfk_2` FOREIGN KEY (`technician_id`) REFERENCES `users` (`id`);

--
-- Filtros para la tabla `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
