from ..extensions import db, iso, utcnow

BOUNDARY_TYPES = ("circle", "polygon")


class Ward(db.Model):
    """A geographic area mapped to a responsible office (circle or polygon boundary)."""

    __tablename__ = "wards"
    __table_args__ = (db.UniqueConstraint("office_id", "code", name="uq_ward_office_code"),)

    id = db.Column(db.Integer, primary_key=True)
    office_id = db.Column(db.Integer, db.ForeignKey("offices.id"), nullable=False, index=True)
    name = db.Column(db.String(160), nullable=False)
    code = db.Column(db.String(30), nullable=False)
    boundary_type = db.Column(db.String(10), nullable=False, default="circle")
    center_lat = db.Column(db.Float)
    center_lng = db.Column(db.Float)
    radius_m = db.Column(db.Float)
    polygon = db.Column(db.JSON)  # [[lat, lng], ...]
    match_priority = db.Column(db.Integer, nullable=False, default=0)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    office = db.relationship("Office", back_populates="wards")

    def to_brief(self):
        return {"id": self.id, "name": self.name, "code": self.code, "office_id": self.office_id}

    def to_dict(self):
        return {
            **self.to_brief(),
            "office": self.office.to_brief() if self.office else None,
            "boundary_type": self.boundary_type,
            "center_lat": self.center_lat,
            "center_lng": self.center_lng,
            "radius_m": self.radius_m,
            "polygon": self.polygon,
            "match_priority": self.match_priority,
            "is_active": self.is_active,
            "created_at": iso(self.created_at),
        }
