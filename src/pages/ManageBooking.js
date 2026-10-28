import { useEffect, useState } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

import aboutHero from "../assets/hero.jpg";

import { db } from "../firebase";
import {
    collection,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc,
    orderBy,
    query,
    Timestamp,
} from "firebase/firestore";

const ROOM_DETAILS = {
    "701": {
        roomType: "Standard AC Room",
        price: 6000,
    },
    "702": {
        roomType: "Standard AC Room",
        price: 6000,
    },
    "703": {
        roomType: "Standard AC Room",
        price: 6000,
    },
    "704": {
        roomType: "Standard AC Room",
        price: 6000,
    },
    "705": {
        roomType: "Standard AC Room",
        price: 6000,
    },
    "706": {
        roomType: "Standard AC Room",
        price: 6000,
    },
    "707": {
        roomType: "Special Sea View AC Room",
        price: 7500,
    },
};

function ManageBooking() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [processingId, setProcessingId] = useState(null);

    // Initialize AOS animations.
    useEffect(() => {
        AOS.init({
            duration: 900,
            once: true,
        });
    }, []);

    // Fetch bookings from Firestore.
    useEffect(() => {
        const bookingsQuery = query(
            collection(db, "bookings"),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(
            bookingsQuery,
            (snapshot) => {
                const bookingList = snapshot.docs.map((document) => ({
                    id: document.id,
                    ...document.data(),
                }));

                setBookings(bookingList);
                setLoading(false);
                setLoadError(false);
            },
            (error) => {
                console.error("Error loading bookings:", error);
                setLoadError(true);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    // Convert Firestore timestamps and other date values safely.
    const toDate = (value) => {
        if (!value) return null;

        if (
            value instanceof Timestamp ||
            (typeof value.toDate === "function")
        ) {
            return value.toDate();
        }

        const date = new Date(value);

        return Number.isNaN(date.getTime()) ? null : date;
    };

    // Format dates for display.
    const formatDate = (value) => {
        const date = toDate(value);

        if (!date) return "N/A";

        return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    // Calculate the number of nights.
    const getNights = (booking) => {
        const arrival = toDate(booking.arrival);
        const departure = toDate(booking.departure);

        if (!arrival || !departure) return 0;

        const start = new Date(
            arrival.getFullYear(),
            arrival.getMonth(),
            arrival.getDate()
        );

        const end = new Date(
            departure.getFullYear(),
            departure.getMonth(),
            departure.getDate()
        );

        return Math.max(
            0,
            Math.round((end - start) / (1000 * 60 * 60 * 24))
        );
    };

    // Read room details, including compatibility with older booking records.
    const getRoomDetails = (booking) => {
        const roomNumber = booking.roomNumber
            ? String(booking.roomNumber)
            : "";

        const room = ROOM_DETAILS[roomNumber];

        return {
            roomNumber: roomNumber || "Not assigned",
            roomType:
                booking.roomType ||
                room?.roomType ||
                "AC Room",
            price:
                Number(booking.roomPrice) ||
                room?.price ||
                0,
        };
    };

    // Calculate the estimated total price.
    const getTotalPrice = (booking) => {
        const room = getRoomDetails(booking);
        const nights = getNights(booking);

        return room.price * nights;
    };

    // Normalize Sri Lankan and international WhatsApp numbers.
    const getWhatsAppNumber = (phone) => {
        let number = String(phone || "").replace(/[\s()-]/g, "");

        if (number.startsWith("+")) {
            number = number.slice(1);
        } else if (number.startsWith("00")) {
            number = number.slice(2);
        } else if (number.startsWith("0")) {
            number = `94${number.slice(1)}`;
        }

        return /^\d{8,15}$/.test(number) ? number : null;
    };

    // Send a booking status notification to the customer.
    const notifyCustomer = (booking, status) => {
        const room = getRoomDetails(booking);
        const arrival = formatDate(booking.arrival);
        const departure = formatDate(booking.departure);

        const isConfirmed = status === "confirmed";

        const message = [
            isConfirmed
                ? "BOOKING CONFIRMED"
                : "BOOKING CANCELLED",
            "",
            "Lunawa Beach Resort",
            "",
            `Name: ${booking.name || "Guest"}`,
            `Room Number: ${room.roomNumber}`,
            `Room Type: ${room.roomType}`,
            `Price per day: Rs. ${room.price.toLocaleString()}`,
            `Check-in: ${arrival}`,
            `Check-out: ${departure}`,
            `Nights: ${getNights(booking)}`,
            `Estimated Total: Rs. ${getTotalPrice(booking).toLocaleString()}`,
            `Adults: ${booking.adults ?? 1}`,
            `Children: ${booking.children ?? 0}`,
            "",
            isConfirmed
                ? "Your booking has been confirmed by Lunawa Beach Resort. We look forward to welcoming you!"
                : "Your booking has been cancelled. Please contact Lunawa Beach Resort if you need assistance.",
            "",
            "Thank you for contacting Lunawa Beach Resort.",
        ].join("\n");

        const clientNumber = getWhatsAppNumber(booking.phone);

        if (!clientNumber) {
            alert(
                "The booking status was updated, but the customer's phone number is invalid. Please contact the customer manually."
            );
            return;
        }

        const whatsappUrl =
            `https://wa.me/${clientNumber}?text=${encodeURIComponent(message)}`;

        window.open(
            whatsappUrl,
            "_blank",
            "noopener,noreferrer"
        );
    };

    // Confirm a booking.
    const confirmBooking = async (booking) => {
        if (processingId) return;

        if (
            booking.status === "confirmed" &&
            !window.confirm("This booking is already confirmed. Send the confirmation message again?")
        ) {
            return;
        }

        setProcessingId(booking.id);

        try {
            if (booking.status !== "confirmed") {
                await updateDoc(
                    doc(db, "bookings", booking.id),
                    {
                        status: "confirmed",
                    }
                );
            }

            notifyCustomer(booking, "confirmed");
        } catch (error) {
            console.error("Error confirming booking:", error);
            alert("Failed to confirm booking. Please try again.");
        } finally {
            setProcessingId(null);
        }
    };

    // Cancel a booking.
    const cancelBooking = async (booking) => {
        if (processingId) return;

        if (
            !window.confirm(
                `Are you sure you want to cancel the booking for ${booking.name || "this guest"} in Room ${booking.roomNumber || "N/A"}?`
            )
        ) {
            return;
        }

        setProcessingId(booking.id);

        try {
            await updateDoc(
                doc(db, "bookings", booking.id),
                {
                    status: "cancelled",
                }
            );

            notifyCustomer(booking, "cancelled");
        } catch (error) {
            console.error("Error cancelling booking:", error);
            alert("Failed to cancel booking. Please try again.");
        } finally {
            setProcessingId(null);
        }
    };

    // Delete a booking permanently.
    const deleteBooking = async (booking) => {
        if (processingId) return;

        const confirmed = window.confirm(
            `Permanently delete the booking for ${booking.name || "this guest"}? This action cannot be undone.`
        );

        if (!confirmed) return;

        setProcessingId(booking.id);

        try {
            await deleteDoc(
                doc(db, "bookings", booking.id)
            );
        } catch (error) {
            console.error("Error deleting booking:", error);
            alert("Failed to delete booking. Please try again.");
        } finally {
            setProcessingId(null);
        }
    };

    // Status badge styling.
    const getStatusClass = (status) => {
        switch (String(status || "pending").toLowerCase()) {
            case "confirmed":
                return "bg-green-100 text-green-700";

            case "cancelled":
                return "bg-red-100 text-red-700";

            case "rejected":
                return "bg-gray-200 text-gray-700";

            case "pending":
            default:
                return "bg-yellow-100 text-yellow-800";
        }
    };

    // Summary statistics.
    const pendingCount = bookings.filter(
        (booking) =>
            String(booking.status || "pending").toLowerCase() === "pending"
    ).length;

    const confirmedCount = bookings.filter(
        (booking) =>
            String(booking.status || "pending").toLowerCase() === "confirmed"
    ).length;

    const cancelledCount = bookings.filter(
        (booking) =>
            String(booking.status || "").toLowerCase() === "cancelled"
    ).length;

    return (
        <div className="w-full overflow-hidden bg-gray-50">

            {/* HERO SECTION */}
            <section className="relative h-[40vh] min-h-[250px] w-full">
                <img
                    src={aboutHero}
                    alt="Manage bookings at Lunawa Beach Resort"
                    className="absolute inset-0 h-full w-full object-fill"
                />

                <div className="absolute inset-0 bg-black/60" />

                
            </section>

            {/* MAIN CONTENT */}
            <section className="px-4 py-10 sm:px-6 sm:py-16">
                <div className="mx-auto max-w-7xl">

                    {/* PAGE TITLE */}
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 sm:text-3xl">
                            Booking Management
                        </h2>

                        <p className="mt-2 text-gray-600">
                            View reservations, manage room bookings, and send
                            booking updates to customers through WhatsApp.
                        </p>
                    </div>

                    {/* ROOM PRICE INFORMATION */}
                    <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                            <h3 className="font-semibold text-gray-800">
                                Standard AC Rooms
                            </h3>

                            <p className="mt-1 text-sm text-gray-500">
                                Rooms 701–706
                            </p>

                            <p className="mt-3 text-2xl font-bold text-[#00A6C7]">
                                Rs. 6,000
                                <span className="ml-1 text-sm font-normal text-gray-500">
                                    / day
                                </span>
                            </p>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                            <h3 className="font-semibold text-gray-800">
                                Special Sea View AC Room
                            </h3>

                            <p className="mt-1 text-sm text-gray-500">
                                Room 707 · Balcony and sea view
                            </p>

                            <p className="mt-3 text-2xl font-bold text-[#00A6C7]">
                                Rs. 7,500
                                <span className="ml-1 text-sm font-normal text-gray-500">
                                    / day
                                </span>
                            </p>

                            <p className="mt-2 text-xs text-gray-500">
                                Includes tea and milk tea facilities.
                            </p>
                        </div>
                    </div>

                    {/* BOOKING STATISTICS */}
                    <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

                        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                            <p className="text-sm text-gray-500">
                                Total Bookings
                            </p>

                            <p className="mt-2 text-3xl font-bold text-gray-800">
                                {bookings.length}
                            </p>
                        </div>

                        <div className="rounded-xl border border-yellow-200 bg-white p-5 shadow-sm">
                            <p className="text-sm text-gray-500">
                                Pending
                            </p>

                            <p className="mt-2 text-3xl font-bold text-yellow-600">
                                {pendingCount}
                            </p>
                        </div>

                        <div className="rounded-xl border border-green-200 bg-white p-5 shadow-sm">
                            <p className="text-sm text-gray-500">
                                Confirmed
                            </p>

                            <p className="mt-2 text-3xl font-bold text-green-600">
                                {confirmedCount}
                            </p>
                        </div>

                        <div className="rounded-xl border border-red-200 bg-white p-5 shadow-sm">
                            <p className="text-sm text-gray-500">
                                Cancelled
                            </p>

                            <p className="mt-2 text-3xl font-bold text-red-600">
                                {cancelledCount}
                            </p>
                        </div>

                    </div>

                    {/* BOOKING TABLE */}
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

                        <div className="border-b border-gray-200 px-5 py-4">
                            <h3 className="text-xl font-bold text-gray-800">
                                All Reservations
                            </h3>

                            <p className="mt-1 text-sm text-gray-500">
                                Select an action to update each reservation.
                            </p>
                        </div>

                        {loading ? (
                            <div className="py-16 text-center text-gray-500">
                                Loading bookings...
                            </div>
                        ) : loadError ? (
                            <div className="px-5 py-12 text-center">
                                <p className="font-semibold text-red-600">
                                    Unable to load bookings.
                                </p>

                                <p className="mt-2 text-sm text-gray-500">
                                    Please check your Firebase connection and
                                    Firestore permissions, then refresh the page.
                                </p>

                                <button
                                    type="button"
                                    onClick={() => window.location.reload()}
                                    className="mt-5 rounded-lg bg-[#00A6C7] px-5 py-3 font-semibold text-white hover:bg-[#0089A5]"
                                >
                                    Refresh Page
                                </button>
                            </div>
                        ) : bookings.length === 0 ? (
                            <div className="px-5 py-16 text-center">
                                <p className="text-lg font-semibold text-gray-700">
                                    No bookings found
                                </p>

                                <p className="mt-2 text-sm text-gray-500">
                                    New booking requests will appear here.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[1150px] border-collapse text-sm">

                                    <thead className="bg-gray-100 text-gray-700">
                                        <tr>
                                            <th className="border-b px-4 py-4 text-left">
                                                Guest
                                            </th>

                                            <th className="border-b px-4 py-4 text-left">
                                                Room Details
                                            </th>

                                            <th className="border-b px-4 py-4 text-left">
                                                Check-in
                                            </th>

                                            <th className="border-b px-4 py-4 text-left">
                                                Check-out
                                            </th>

                                            <th className="border-b px-4 py-4 text-left">
                                                Guests
                                            </th>

                                            <th className="border-b px-4 py-4 text-left">
                                                Estimated Total
                                            </th>

                                            <th className="border-b px-4 py-4 text-center">
                                                Status
                                            </th>

                                            <th className="border-b px-4 py-4 text-center">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {bookings.map((booking) => {
                                            const room = getRoomDetails(booking);
                                            const status = String(
                                                booking.status || "pending"
                                            ).toLowerCase();

                                            const isProcessing =
                                                processingId === booking.id;

                                            return (
                                                <tr
                                                    key={booking.id}
                                                    className="transition hover:bg-gray-50"
                                                >

                                                    {/* GUEST */}
                                                    <td className="border-b px-4 py-4">
                                                        <p className="font-semibold text-gray-800">
                                                            {booking.name || "N/A"}
                                                        </p>

                                                        <p className="mt-1 text-xs text-gray-500">
                                                            {booking.country || "N/A"}
                                                        </p>

                                                        <p className="mt-1 text-xs text-gray-500">
                                                            {booking.createdAt
                                                                ? `Requested: ${formatDate(booking.createdAt)}`
                                                                : ""}
                                                        </p>
                                                    </td>

                                                    {/* ROOM */}
                                                    <td className="border-b px-4 py-4">
                                                        <p className="font-semibold text-gray-800">
                                                            {room.roomNumber !== "Not assigned"
                                                                ? `Room ${room.roomNumber}`
                                                                : room.roomNumber}
                                                        </p>

                                                        <p className="mt-1 text-xs text-gray-500">
                                                            {room.roomType}
                                                        </p>

                                                        <p className="mt-1 text-xs font-medium text-[#0089A5]">
                                                            Rs. {room.price.toLocaleString()}/day
                                                        </p>
                                                    </td>

                                                    {/* ARRIVAL */}
                                                    <td className="border-b px-4 py-4 whitespace-nowrap">
                                                        {formatDate(booking.arrival)}
                                                    </td>

                                                    {/* DEPARTURE */}
                                                    <td className="border-b px-4 py-4 whitespace-nowrap">
                                                        {formatDate(booking.departure)}

                                                        <p className="mt-1 text-xs text-gray-500">
                                                            {getNights(booking)} night(s)
                                                        </p>
                                                    </td>

                                                    {/* GUEST COUNT */}
                                                    <td className="border-b px-4 py-4 whitespace-nowrap">
                                                        <p>
                                                            {booking.adults ?? 1} Adult(s)
                                                        </p>

                                                        <p className="mt-1 text-xs text-gray-500">
                                                            {booking.children ?? 0} Child(ren)
                                                        </p>
                                                    </td>

                                                    {/* PRICE */}
                                                    <td className="border-b px-4 py-4 whitespace-nowrap">
                                                        <p className="font-bold text-gray-800">
                                                            Rs. {getTotalPrice(booking).toLocaleString()}
                                                        </p>

                                                        <p className="mt-1 text-xs text-gray-500">
                                                            Estimated stay cost
                                                        </p>
                                                    </td>

                                                    {/* STATUS */}
                                                    <td className="border-b px-4 py-4 text-center">
                                                        <span
                                                            className={`inline-block rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusClass(status)}`}
                                                        >
                                                            {status}
                                                        </span>
                                                    </td>

                                                    {/* ACTIONS */}
                                                    <td className="border-b px-4 py-4">
                                                        <div className="flex min-w-[130px] flex-col gap-2">

                                                            <button
                                                                type="button"
                                                                disabled={Boolean(processingId)}
                                                                onClick={() => confirmBooking(booking)}
                                                                className="rounded-lg bg-green-600 px-3 py-2 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                            >
                                                                {isProcessing
                                                                    ? "Processing..."
                                                                    : status === "confirmed"
                                                                        ? "Send Confirmation"
                                                                        : "Confirm"}
                                                            </button>

                                                            <button
                                                                type="button"
                                                                disabled={Boolean(processingId) || status === "cancelled"}
                                                                onClick={() => cancelBooking(booking)}
                                                                className="rounded-lg bg-yellow-500 px-3 py-2 font-semibold text-white transition hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-50"
                                                            >
                                                                Cancel
                                                            </button>

                                                            <button
                                                                type="button"
                                                                disabled={Boolean(processingId)}
                                                                onClick={() => deleteBooking(booking)}
                                                                className="rounded-lg bg-red-600 px-3 py-2 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                            >
                                                                Delete
                                                            </button>

                                                            {booking.phone && (
                                                                <button
                                                                    type="button"
                                                                    disabled={Boolean(processingId)}
                                                                    onClick={() => {
                                                                        const number = getWhatsAppNumber(booking.phone);

                                                                        if (!number) {
                                                                            alert("Invalid customer phone number.");
                                                                            return;
                                                                        }

                                                                        const url =
                                                                            `https://wa.me/${number}?text=${encodeURIComponent(
                                                                                `Hello ${booking.name || "Guest"}, this is Lunawa Beach Resort regarding your booking for Room ${room.roomNumber}.`
                                                                            )}`;

                                                                        window.open(
                                                                            url,
                                                                            "_blank",
                                                                            "noopener,noreferrer"
                                                                        );
                                                                    }}
                                                                    className="rounded-lg bg-[#128C7E] px-3 py-2 font-semibold text-white transition hover:bg-[#075E54] disabled:cursor-not-allowed disabled:opacity-50"
                                                                >
                                                                    WhatsApp
                                                                </button>
                                                            )}

                                                        </div>
                                                    </td>

                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* CONTACT INFORMATION */}
                    <div className="mt-6 rounded-xl border border-cyan-100 bg-cyan-50 p-5">
                        <h3 className="font-semibold text-gray-800">
                            Booking Management Notes
                        </h3>

                        <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-gray-600">
                            <li>
                                Rooms 701–706 cost Rs. 6,000 per day.
                            </li>

                            <li>
                                Special sea-view Room 707 costs Rs. 7,500 per day.
                            </li>

                            <li>
                                Pending booking requests block room availability
                                on the booking form until cancelled or rejected.
                            </li>

                            <li>
                                Confirmed and pending bookings are included in
                                the estimated room availability checks.
                            </li>

                            <li>
                                Confirming or cancelling a booking updates its
                                Firestore status and opens WhatsApp to prepare a
                                customer notification.
                            </li>
                        </ul>
                    </div>

                </div>
            </section>
        </div>
    );
}

export default ManageBooking;