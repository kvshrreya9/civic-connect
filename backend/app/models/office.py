from ..extensions import db, iso, utcnow

OFFICE_TYPES = ("municipality", "panchayat", "corporation")


class Office(db.Model):
    """A municipality / panchayat office that is responsible for a jurisdiction."""

    __tablename__ = "offices"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(160), unique=True, nullable=False)
    code = db.Column(db.String(30), unique=True, nullable=False, index=True)
    office_type = db.Column(db.String(20), nullable=False, default="municipality")
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    address = db.Column(db.String(500))
    contact_email = db.Column(db.String(255))
    contact_phone = db.Column(db.String(32))
    critical_alert_phone = db.Column(db.String(32))
    critical_response_minutes = db.Column(db.Integer, nullable=False, default=60)
    high_response_minutes = db.Column(db.Integer, nullable=False, default=240)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    wards = db.relationship("Ward", back_populates="office", order_by="Ward.name")
    staff = db.relationship("User", back_populates="office", foreign_keys="User.office_id")

    def to_brief(self):
        return {"id": self.id, "name": self.name, "code": self.code, "office_type": self.office_type}

    def to_dict(self):
        return {
            **self.to_brief(),
            "latitude": self.latitude,
            "longitude": self.longitude,
            "address": self.address,
            "contact_email": self.contact_email,
            "contact_phone": self.contact_phone,
            "critical_alert_phone": self.critical_alert_phone,
            "critical_response_minutes": self.critical_response_minutes,
            "high_response_minutes": self.high_response_minutes,
            "is_active": self.is_active,
            "ward_count": len([w for w in self.wards if w.is_active]),
            "created_at": iso(self.created_at),
        }
