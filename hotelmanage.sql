CREATE DATABASE IF NOT EXISTS hotel_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;

USE hotel_management;

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

SET FOREIGN_KEY_CHECKS = 0;

START TRANSACTION;

-- --------------------
-- TABLES
-- --------------------

CREATE TABLE `admin` (
  `Admin_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Name` varchar(100) DEFAULT NULL,
  `Phone` varchar(20) DEFAULT NULL,
  `Password` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`Admin_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `customer` (
  `Customer_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Name` varchar(100) NOT NULL,
  `Email` varchar(100) NOT NULL,
  `Phone` varchar(20) DEFAULT NULL,
  `Password` varchar(100) NOT NULL,
  PRIMARY KEY (`Customer_ID`),
  UNIQUE (`Email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `room` (
  `Room_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Room_Type` varchar(50) DEFAULT NULL,
  `Price` decimal(10,2) DEFAULT NULL,
  `Availability_Status` varchar(20) DEFAULT 'Available',
  PRIMARY KEY (`Room_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `service` (
  `Service_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Service_Name` varchar(100) DEFAULT NULL,
  `Price` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`Service_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `booking` (
  `Booking_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Customer_ID` int(11) DEFAULT NULL,
  `Room_ID` int(11) DEFAULT NULL,
  `Check_In_Date` date DEFAULT NULL,
  `Check_Out_Date` date DEFAULT NULL,
  `Booking_Status` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`Booking_ID`),
  FOREIGN KEY (`Customer_ID`) REFERENCES `customer`(`Customer_ID`) ON DELETE CASCADE,
  FOREIGN KEY (`Room_ID`) REFERENCES `room`(`Room_ID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `invoice` (
  `Invoice_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Customer_ID` int(11) DEFAULT NULL,
  `Booking_ID` int(11) DEFAULT NULL,
  `Service_ID` int(11) DEFAULT NULL,
  `Total_Amount` decimal(10,2) DEFAULT NULL,
  `Date` date DEFAULT NULL,
  PRIMARY KEY (`Invoice_ID`),
  FOREIGN KEY (`Customer_ID`) REFERENCES `customer`(`Customer_ID`),
  FOREIGN KEY (`Booking_ID`) REFERENCES `booking`(`Booking_ID`),
  FOREIGN KEY (`Service_ID`) REFERENCES `service`(`Service_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `payment` (
  `Payment_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Invoice_ID` int(11) DEFAULT NULL,
  `Payment_Date` date DEFAULT NULL,
  `Amount` decimal(10,2) DEFAULT NULL,
  `Status` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`Payment_ID`),
  FOREIGN KEY (`Invoice_ID`) REFERENCES `invoice`(`Invoice_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `review` (
  `Review_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Customer_ID` int(11) DEFAULT NULL,
  `Room_ID` int(11) DEFAULT NULL,
  `Rating` int(11) DEFAULT NULL CHECK (`Rating` BETWEEN 1 AND 5),
  `Comment` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`Review_ID`),
  FOREIGN KEY (`Customer_ID`) REFERENCES `customer`(`Customer_ID`),
  FOREIGN KEY (`Room_ID`) REFERENCES `room`(`Room_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------
-- DATA
-- --------------------

INSERT INTO `admin` VALUES
(1, 'Bro', '01811111111', 'adminpass');

INSERT INTO `customer` VALUES
(1, 'sis', 'sis@gmail.com', '01712345678', 'pass123');

INSERT INTO `room` VALUES
(1, 'Deluxe', 5000.00, 'Available');

INSERT INTO `service` VALUES
(1, 'Room Cleaning', 500.00);

INSERT INTO `booking` VALUES
(1, 1, 1, '2026-04-15', '2026-04-18', 'Confirmed');

INSERT INTO `invoice` VALUES
(1, 1, 1, 1, 5500.00, '2026-04-15');

INSERT INTO `payment` VALUES
(1, 1, '2026-04-15', 5500.00, 'Paid');

INSERT INTO `review` VALUES
(1, 1, 1, 5, 'So cool!');

COMMIT;

SET FOREIGN_KEY_CHECKS = 1;