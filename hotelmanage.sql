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
  `Image_URL` varchar(255) DEFAULT NULL,
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
  FOREIGN KEY (`Customer_ID`) REFERENCES `customer`(`Customer_ID`) ON DELETE SET NULL,
  FOREIGN KEY (`Booking_ID`) REFERENCES `booking`(`Booking_ID`) ON DELETE SET NULL,
  FOREIGN KEY (`Service_ID`) REFERENCES `service`(`Service_ID`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `payment` (
  `Payment_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Invoice_ID` int(11) DEFAULT NULL,
  `Payment_Date` date DEFAULT NULL,
  `Amount` decimal(10,2) DEFAULT NULL,
  `Status` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`Payment_ID`),
  FOREIGN KEY (`Invoice_ID`) REFERENCES `invoice`(`Invoice_ID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `review` (
  `Review_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Customer_ID` int(11) DEFAULT NULL,
  `Room_ID` int(11) DEFAULT NULL,
  `Rating` int(11) DEFAULT NULL CHECK (`Rating` BETWEEN 1 AND 5),
  `Comment` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`Review_ID`),
  FOREIGN KEY (`Customer_ID`) REFERENCES `customer`(`Customer_ID`) ON DELETE CASCADE,
  FOREIGN KEY (`Room_ID`) REFERENCES `room`(`Room_ID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------
-- DATA
-- --------------------

INSERT INTO `admin` (`Admin_ID`, `Name`, `Phone`, `Password`) VALUES
(1, 'Nushrat', '01811111111', '123'),
(2, 'Mehrin', '01822222222', 'pass'),
(3, 'Sarah', '01833333333', 'admin');

INSERT INTO `customer` (`Customer_ID`, `Name`, `Email`, `Phone`, `Password`) VALUES
(1, 'John Doe', 'john@example.com', '01712345678', 'pass123'),
(2, 'Jane Smith', 'jane@example.com', '01722345678', 'securepass'),
(3, 'Michael Brown', 'michael@example.com', '01732345678', 'guest1'),
(4, 'Emily Davis', 'emily@example.com', '01742345678', 'stay2026'),
(5, 'Chris Wilson', 'chris@example.com', '01752345678', 'holiday4'),
(6, 'Jessica Taylor', 'jessica@example.com', '01762345678', 'jsmith33');

INSERT INTO `room` (`Room_ID`, `Room_Type`, `Price`, `Availability_Status`, `Image_URL`) VALUES
(1, 'Skyline Executive Series', 12000.00, 'Available', 'room1.avif'),
(2, 'Urban Loft Classic', 8000.00, 'Available', 'room2.jpeg'),
(3, 'The Royal Penthouse', 25000.00, 'Available', 'room3.jpg');

INSERT INTO `service` (`Service_ID`, `Service_Name`, `Price`) VALUES
(1, 'Luxury Buffet Breakfast', 1500.00),
(2, 'Airport Transfer', 3000.00),
(3, 'Full Body Spa', 5000.00),
(4, 'Laundry Service', 800.00),
(5, 'In-Room Dining', 2000.00);

INSERT INTO `booking` (`Booking_ID`, `Customer_ID`, `Room_ID`, `Check_In_Date`, `Check_Out_Date`, `Booking_Status`) VALUES
(1, 1, 1, '2026-05-01', '2026-05-04', 'Confirmed'),
(2, 2, 2, '2026-05-10', '2026-05-12', 'Confirmed');

INSERT INTO `invoice` (`Invoice_ID`, `Customer_ID`, `Booking_ID`, `Service_ID`, `Total_Amount`, `Date`) VALUES
(1, 1, 1, 1, 37500.00, '2026-05-01'),
(2, 2, 2, 2, 19000.00, '2026-05-10');

INSERT INTO `payment` (`Payment_ID`, `Invoice_ID`, `Payment_Date`, `Amount`, `Status`) VALUES
(1, 1, '2026-05-04', 37500.00, 'Paid'),
(2, 2, '2026-05-12', 19000.00, 'Paid');

INSERT INTO `review` (`Review_ID`, `Customer_ID`, `Room_ID`, `Rating`, `Comment`) VALUES
(1, 1, 1, 5, 'Absolutely fantastic experience! The staff was wonderful.'),
(2, 2, 2, 4, 'Very good stay, but the AC was slightly noisy.'),
(3, 3, 3, 5, 'The penthouse was a dream come true.'),
(4, 4, 1, 2, 'Disappointed with the room service timing. Too slow.');

COMMIT;

SET FOREIGN_KEY_CHECKS = 1;
