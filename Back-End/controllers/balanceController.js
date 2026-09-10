const Balance = require("../models/clientBlance");
const Reservation = require("../models/reservation");

exports.getMyBalance = async (req, res) => {
  try {
    const balance = await Balance.findOne({ client: req.user._id });
    res.json(balance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyWallet = async (req, res) => {
  try {
    const balance = await Balance.findOne({ client: req.user._id });
    const reservations = await Reservation.find({ client: req.user._id })
      .populate("voyage", "destination prix date heure")
      .sort({ createdAt: -1 });

    const depenses = reservations.map(r => ({
      _id: r._id,
      destination: r.voyage?.destination || "Voyage",
      montant: r.voyage ? r.voyage.prix * r.placesReservees : 0,
      places: r.placesReservees,
      date: r.createdAt,
      status: r.status,
    }));

    res.json({
      soldeActuel: balance?.amount ?? 0,
      depenses,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
