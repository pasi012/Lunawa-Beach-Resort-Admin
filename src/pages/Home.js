import { useEffect, useState } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";
import aboutHero from "../assets/hero.jpg";

const ROOM_DETAILS = {
    "701": { roomType: "Standard AC Room", price: 6000 },
    "702": { roomType: "Standard AC Room", price: 6000 },
    "703": { roomType: "Standard AC Room", price: 6000 },
    "704": { roomType: "Standard AC Room", price: 6000 },
    "705": { roomType: "Standard AC Room", price: 6000 },
    "706": {
        roomType: "Special Sea View AC Room",
        price: 7500,
        description:
            "Private balcony, sea view, tea and milk tea facilities.",
    },
    "707": { roomType: "Special Sea View AC Room", price: 7500 },
};

const ROOM_NUMBERS = Object.keys(ROOM_DETAILS);

function Home() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        AOS.init({
            duration: 900,
            once: true,
        });

        const unsubscribe = onSnapshot(
            collection(db, "bookings"),
            (snapshot) => {
                const list = snapshot.docs.map((document) => ({
                    id: document.id,
                    ...document.data(),
                }));

                list.sort((a, b) => {
                    const dateA = toDate(a.createdAt)?.getTime() || 0;
                    const dateB = toDate(b.createdAt)?.getTime() || 0;

                    return dateB - dateA;
                });

                setBookings(list);
                setLoading(false);
                setError(false);
            },
            (err) => {
                console.error("Error fetching bookings:", err);
                setError(true);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    // Convert Firestore timestamps and other date formats.
    function toDate(value) {
        if (!value) return null;

        if (typeof value.toDate === "function") {
            return value.toDate();
        }

        const date = new Date(value);

        return Number.isNaN(date.getTime()) ? null : date;
    }

    // Format currency in Sri Lankan rupees.
    const formatCurrency = (amount) =>
        `Rs. ${Number(amount || 0).toLocaleString("en-LK")}`;

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

    // Normalize booking status.
    const getStatus = (booking) =>
        String(booking.status || "pending").toLowerCase();

    // Calculate the number of nights in a booking.
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

    // Read room pricing from the booking or room inventory.
    const getRoomPrice = (booking) => {
        const roomNumber = String(booking.roomNumber || "");
        const inventoryRoom = ROOM_DETAILS[roomNumber];

        return inventoryRoom?.price ?? (Number(booking.roomPrice) || 0);
    };

    // Calculate estimated revenue for a booking.
    const getBookingTotal = (booking) =>
        getRoomPrice(booking) * getNights(booking);

    // ---------------- BOOKING STATISTICS ----------------

    const totalBookings = bookings.length;

    const statusCounts = {
        pending: bookings.filter(
            (booking) => getStatus(booking) === "pending"
        ).length,

        confirmed: bookings.filter(
            (booking) => getStatus(booking) === "confirmed"
        ).length,

        cancelled: bookings.filter(
            (booking) => getStatus(booking) === "cancelled"
        ).length,

        rejected: bookings.filter(
            (booking) => getStatus(booking) === "rejected"
        ).length,
    };

    const activeBookings = bookings.filter((booking) =>
        !["cancelled", "rejected"].includes(getStatus(booking))
    );

    const confirmedBookings = bookings.filter(
        (booking) => getStatus(booking) === "confirmed"
    );

    // Revenue is estimated from confirmed bookings only.
    const estimatedRevenue = confirmedBookings.reduce(
        (total, booking) => total + getBookingTotal(booking),
        0
    );

    // ---------------- ROOM STATISTICS ----------------

    const roomCounts = ROOM_NUMBERS.map((roomNumber) => {
        const room = ROOM_DETAILS[roomNumber];

        const roomBookings = bookings.filter(
            (booking) =>
                String(booking.roomNumber || "") === roomNumber
        );

        const confirmed = roomBookings.filter(
            (booking) => getStatus(booking) === "confirmed"
        ).length;

        const pending = roomBookings.filter(
            (booking) => getStatus(booking) === "pending"
        ).length;

        const cancelled = roomBookings.filter(
            (booking) => getStatus(booking) === "cancelled"
        ).length;

        return {
            roomNumber,
            ...room,
            total: roomBookings.length,
            confirmed,
            pending,
            cancelled,
        };
    });

    const standardRoomBookings = bookings.filter((booking) => {
        const roomNumber = Number(booking.roomNumber);
        return roomNumber >= 701 && roomNumber <= 705;
    });

    const specialRoomBookings = bookings.filter((booking) => {
        const roomNumber = Number(booking.roomNumber);
        return roomNumber === 706 || roomNumber === 707;
    });

    // ---------------- CURRENT ROOM STATUS ----------------

    const today = new Date();

    const todayStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
    );

    const isOccupiedToday = (roomNumber) => {
        return activeBookings.some((booking) => {
            if (String(booking.roomNumber || "") !== roomNumber) {
                return false;
            }

            const arrival = toDate(booking.arrival);
            const departure = toDate(booking.departure);

            if (!arrival || !departure) return false;

            const arrivalDay = new Date(
                arrival.getFullYear(),
                arrival.getMonth(),
                arrival.getDate()
            );

            const departureDay = new Date(
                departure.getFullYear(),
                departure.getMonth(),
                departure.getDate()
            );

            return (
                arrivalDay <= todayStart &&
                departureDay > todayStart
            );
        });
    };

    const occupiedRooms = ROOM_NUMBERS.filter(
        (roomNumber) => isOccupiedToday(roomNumber)
    ).length;

    const availableRooms = ROOM_NUMBERS.length - occupiedRooms;

    const statusClass = (status) => {
        switch (status) {
            case "confirmed":
                return "bg-green-100 text-green-700";

            case "cancelled":
                return "bg-red-100 text-red-700";

            case "rejected":
                return "bg-gray-200 text-gray-700";

            default:
                return "bg-yellow-100 text-yellow-800";
        }
    };

    return (
        <div className="min-h-screen w-full overflow-hidden bg-gray-50">

            {/* ================= HERO ================= */}
            <section className="relative h-[40vh] min-h-[250px] w-full">
                <img
                    src={aboutHero}
                    alt="Lunawa Beach Resort booking dashboard"
                    className="absolute inset-0 h-full w-full object-fill"
                />

                <div className="absolute inset-0 bg-black/60" />


            </section>

            {/* ================= DASHBOARD CONTENT ================= */}
            <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">

                {error && (
                    <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
                        Unable to load booking data. Please check your Firebase
                        connection and refresh the page.
                    </div>
                )}

                {loading ? (
                    <div className="py-20 text-center">
                        <p className="text-lg font-semibold text-gray-700">
                            Loading dashboard...
                        </p>
                    </div>
                ) : (
                    <>
                        {/* ================= SUMMARY CARDS ================= */}
                        <section
                            data-aos="fade-up"
                            className="mb-10 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4"
                        >
                            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-gray-500">
                                        Total Bookings
                                    </p>

                                    <span className="rounded-lg bg-blue-100 p-3 text-blue-700">
                                        <svg
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            className="h-6 w-6"
                                        >
                                            <rect x="3" y="5" width="18" height="16" rx="2" />
                                            <path d="M16 3v4M8 3v4M3 11h18" />
                                        </svg>
                                    </span>
                                </div>

                                <p className="mt-4 text-3xl font-bold text-gray-800">
                                    {totalBookings}
                                </p>

                                <p className="mt-2 text-xs text-gray-500">
                                    All booking requests
                                </p>
                            </div>

                            <div className="rounded-xl border border-yellow-200 bg-white p-6 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-gray-500">
                                        Pending Requests
                                    </p>

                                    <span className="rounded-lg bg-yellow-100 p-3 text-yellow-700">
                                        <svg
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            className="h-6 w-6"
                                        >
                                            <circle cx="12" cy="12" r="9" />
                                            <path d="M12 7v5l3 2" />
                                        </svg>
                                    </span>
                                </div>

                                <p className="mt-4 text-3xl font-bold text-yellow-600">
                                    {statusCounts.pending}
                                </p>

                                <p className="mt-2 text-xs text-gray-500">
                                    Awaiting confirmation
                                </p>
                            </div>

                            <div className="rounded-xl border border-green-200 bg-white p-6 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-gray-500">
                                        Confirmed Bookings
                                    </p>

                                    <span className="rounded-lg bg-green-100 p-3 text-green-700">
                                        <svg
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            className="h-6 w-6"
                                        >
                                            <circle cx="12" cy="12" r="9" />
                                            <path d="m8 12 3 3 5-6" />
                                        </svg>
                                    </span>
                                </div>

                                <p className="mt-4 text-3xl font-bold text-green-600">
                                    {statusCounts.confirmed}
                                </p>

                                <p className="mt-2 text-xs text-gray-500">
                                    Reservations confirmed
                                </p>
                            </div>

                            <div className="rounded-xl border border-cyan-200 bg-white p-6 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-gray-500">
                                        Estimated Revenue
                                    </p>

                                    <span className="rounded-lg bg-cyan-100 p-3 text-cyan-700">
                                        <svg
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            className="h-6 w-6"
                                        >
                                            <rect x="3" y="5" width="18" height="14" rx="2" />
                                            <path d="M3 10h18M7 15h3" />
                                        </svg>
                                    </span>
                                </div>

                                <p className="mt-4 text-2xl font-bold text-[#0089A5] sm:text-3xl">
                                    {formatCurrency(estimatedRevenue)}
                                </p>

                                <p className="mt-2 text-xs text-gray-500">
                                    Confirmed stays, estimated room charges
                                </p>
                            </div>
                        </section>

                        {/* ================= ROOM AVAILABILITY ================= */}
                        <section
                            data-aos="fade-up"
                            className="mb-10 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7"
                        >
                            <div className="mb-6">
                                <h2 className="text-xl font-bold text-gray-800 sm:text-2xl">
                                    Room Availability
                                </h2>

                                <p className="mt-2 text-sm text-gray-500">
                                    Today's room status based on active booking
                                    date ranges.
                                </p>
                            </div>

                            <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div className="rounded-lg bg-gray-50 p-4">
                                    <p className="text-sm text-gray-500">
                                        Total Rooms
                                    </p>

                                    <p className="mt-2 text-2xl font-bold text-gray-800">
                                        {ROOM_NUMBERS.length}
                                    </p>
                                </div>

                                <div className="rounded-lg bg-red-50 p-4">
                                    <p className="text-sm text-gray-500">
                                        Rooms With Active Bookings Today
                                    </p>

                                    <p className="mt-2 text-2xl font-bold text-red-600">
                                        {occupiedRooms}
                                    </p>
                                </div>

                                <div className="rounded-lg bg-green-50 p-4">
                                    <p className="text-sm text-gray-500">
                                        No Active Booking Today
                                    </p>

                                    <p className="mt-2 text-2xl font-bold text-green-600">
                                        {availableRooms}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {ROOM_NUMBERS.map((roomNumber) => {
                                    const room = ROOM_DETAILS[roomNumber];
                                    const occupied = isOccupiedToday(roomNumber);

                                    const roomBookings = bookings.filter(
                                        (booking) =>
                                            String(booking.roomNumber || "") === roomNumber
                                    );

                                    const roomConfirmed = roomBookings.filter(
                                        (booking) => getStatus(booking) === "confirmed"
                                    ).length;

                                    const roomPending = roomBookings.filter(
                                        (booking) => getStatus(booking) === "pending"
                                    ).length;

                                    return (
                                        <div
                                            key={roomNumber}
                                            className={`rounded-xl border p-5 ${occupied
                                                ? "border-red-200 bg-red-50"
                                                : "border-green-200 bg-green-50"
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <h3 className="text-lg font-bold text-gray-800">
                                                        Room {roomNumber}
                                                    </h3>

                                                    <p className="mt-1 text-xs text-gray-600">
                                                        {room.roomType}
                                                    </p>
                                                </div>

                                                <span
                                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${occupied
                                                        ? "bg-red-100 text-red-700"
                                                        : "bg-green-100 text-green-700"
                                                        }`}
                                                >
                                                    {occupied ? "Occupied" : "Available"}
                                                </span>
                                            </div>

                                            <p className="mt-4 text-lg font-bold text-[#0089A5]">
                                                {formatCurrency(room.price)}
                                                <span className="text-xs font-normal text-gray-500">
                                                    {" "}/ day
                                                </span>
                                            </p>

                                            <div className="mt-4 flex justify-between border-t border-gray-200 pt-3 text-xs text-gray-600">
                                                <span>
                                                    Confirmed: {roomConfirmed}
                                                </span>

                                                <span>
                                                    Pending: {roomPending}
                                                </span>
                                            </div>

                                            {["706", "707"].includes(roomNumber) && (
                                                <p className="mt-3 text-xs font-medium text-cyan-800">
                                                    Private balcony · Sea view · Tea and milk tea facilities
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        {/* ================= BOOKINGS PER ROOM TYPE ================= */}
                        <section
                            data-aos="fade-up"
                            className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-2"
                        >
                            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
                                <h2 className="text-xl font-bold text-gray-800">
                                    Bookings by Room Type
                                </h2>

                                <p className="mt-2 text-sm text-gray-500">
                                    Distribution of booking requests.
                                </p>

                                {[
                                    {
                                        label: "Standard AC Rooms (701–705)",
                                        count: standardRoomBookings.length,
                                        color: "bg-[#c97b3a]",
                                    },
                                    {
                                        label: "Special Sea View Rooms (706-707)",
                                        count: specialRoomBookings.length,
                                        color: "bg-[#00A6C7]",
                                    },
                                ].map((item) => {
                                    const percentage = totalBookings
                                        ? Math.round(
                                            (item.count / totalBookings) * 100
                                        )
                                        : 0;

                                    return (
                                        <div key={item.label} className="mt-7">
                                            <div className="mb-2 flex items-center justify-between gap-3">
                                                <span className="text-sm font-medium text-gray-700">
                                                    {item.label}
                                                </span>

                                                <span className="font-bold text-gray-800">
                                                    {item.count}
                                                </span>
                                            </div>

                                            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                                                    style={{
                                                        width: `${percentage}%`,
                                                    }}
                                                />
                                            </div>

                                            <p className="mt-2 text-right text-xs text-gray-500">
                                                {percentage}% of all bookings
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* STATUS BREAKDOWN */}
                            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
                                <h2 className="text-xl font-bold text-gray-800">
                                    Booking Status Breakdown
                                </h2>

                                <p className="mt-2 text-sm text-gray-500">
                                    Current status of all booking requests.
                                </p>

                                {[
                                    {
                                        label: "Pending",
                                        count: statusCounts.pending,
                                        color: "bg-yellow-500",
                                    },
                                    {
                                        label: "Confirmed",
                                        count: statusCounts.confirmed,
                                        color: "bg-green-500",
                                    },
                                    {
                                        label: "Cancelled",
                                        count: statusCounts.cancelled,
                                        color: "bg-red-500",
                                    },
                                    {
                                        label: "Rejected",
                                        count: statusCounts.rejected,
                                        color: "bg-gray-500",
                                    },
                                ].map((item) => {
                                    const percentage = totalBookings
                                        ? Math.round(
                                            (item.count / totalBookings) * 100
                                        )
                                        : 0;

                                    return (
                                        <div key={item.label} className="mt-5">
                                            <div className="mb-2 flex justify-between">
                                                <span className="text-sm font-medium text-gray-700">
                                                    {item.label}
                                                </span>

                                                <span className="text-sm font-bold text-gray-800">
                                                    {item.count}
                                                </span>
                                            </div>

                                            <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                                                <div
                                                    className={`h-full rounded-full ${item.color}`}
                                                    style={{
                                                        width: `${percentage}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        {/* ================= RECENT BOOKINGS ================= */}
                        <section
                            data-aos="fade-up"
                            className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
                        >
                            <div className="flex flex-col justify-between gap-3 border-b border-gray-200 px-5 py-5 sm:flex-row sm:items-center sm:px-7">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800 sm:text-2xl">
                                        Recent Bookings
                                    </h2>

                                    <p className="mt-2 text-sm text-gray-500">
                                        Latest booking requests received by the resort.
                                    </p>
                                </div>

                                <span className="w-fit rounded-full bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-800">
                                    {totalBookings} total
                                </span>
                            </div>

                            {bookings.length === 0 ? (
                                <div className="px-5 py-14 text-center">
                                    <p className="font-semibold text-gray-700">
                                        No bookings available
                                    </p>

                                    <p className="mt-2 text-sm text-gray-500">
                                        New reservations will appear here.
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[850px] text-left text-sm">
                                        <thead className="bg-gray-100 text-gray-600">
                                            <tr>
                                                <th className="px-5 py-4">
                                                    Guest
                                                </th>

                                                <th className="px-5 py-4">
                                                    Room
                                                </th>

                                                <th className="px-5 py-4">
                                                    Check-in
                                                </th>

                                                <th className="px-5 py-4">
                                                    Check-out
                                                </th>

                                                <th className="px-5 py-4">
                                                    Estimated Total
                                                </th>

                                                <th className="px-5 py-4">
                                                    Status
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {bookings.slice(0, 10).map((booking) => {
                                                const roomNumber = String(
                                                    booking.roomNumber || ""
                                                );

                                                const room = ROOM_DETAILS[roomNumber];

                                                const status = getStatus(booking);

                                                return (
                                                    <tr
                                                        key={booking.id}
                                                        className="border-t border-gray-100 transition hover:bg-gray-50"
                                                    >
                                                        <td className="px-5 py-4">
                                                            <p className="font-semibold text-gray-800">
                                                                {booking.name || "Guest"}
                                                            </p>

                                                            <p className="mt-1 text-xs text-gray-500">
                                                                {booking.email || "No email"}
                                                            </p>
                                                        </td>

                                                        <td className="px-5 py-4">
                                                            <p className="font-medium text-gray-800">
                                                                {roomNumber
                                                                    ? `Room ${roomNumber}`
                                                                    : "Not assigned"}
                                                            </p>

                                                            <p className="mt-1 text-xs text-gray-500">
                                                                {booking.roomType ||
                                                                    room?.roomType ||
                                                                    "AC Room"}
                                                            </p>
                                                        </td>

                                                        <td className="whitespace-nowrap px-5 py-4">
                                                            {formatDate(booking.arrival)}
                                                        </td>

                                                        <td className="whitespace-nowrap px-5 py-4">
                                                            {formatDate(booking.departure)}
                                                        </td>

                                                        <td className="whitespace-nowrap px-5 py-4 font-semibold text-gray-800">
                                                            {formatCurrency(
                                                                getBookingTotal(booking)
                                                            )}
                                                        </td>

                                                        <td className="px-5 py-4">
                                                            <span
                                                                className={`inline-block rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClass(status)}`}
                                                            >
                                                                {status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>

                        {/* ================= FOOTNOTE ================= */}
                        <p className="mt-6 text-center text-xs leading-relaxed text-gray-500">
                            Revenue is an estimate based on confirmed bookings,
                            room rates and stay duration. It does not represent
                            verified payments. Room availability reflects active
                            booking date ranges and should be verified before
                            confirming a new reservation.
                        </p>
                    </>
                )}
            </main>
        </div>
    );
}

export default Home;