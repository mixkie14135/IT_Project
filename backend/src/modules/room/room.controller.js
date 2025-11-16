const prisma = require('../../config/prisma.js');
const policy = require('../../config/reservationPolicy');

/**
 * GET /api/rooms
 * ดึงรายการห้องทั้งหมด (pagination, filter, include)
 */
exports.getRooms = async (req, res) => {
  try {
    const page  = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
    const skip  = (page - 1) * limit;

    const { status, typeId, minPrice, maxPrice, capacityGte, search, include } = req.query;

    const where = {};

    if (status) where.status = status;
    if (typeId) where.room_type_id = Number(typeId);
    if (capacityGte) where.capacity = { gte: Number(capacityGte) };

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = String(minPrice);
      if (maxPrice) where.price.lte = String(maxPrice);
    }

    if (search) {
      where.OR = [
        { room_number: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const includeObj = {};
    const inc = (include || '').split(',').map(s => s.trim().toLowerCase());
    if (inc.includes('type')) includeObj.room_type = true;
    if (inc.includes('images')) includeObj.room_image = true;

    const [items, total] = await Promise.all([
      prisma.room.findMany({
        where,
        skip,
        take: limit,
        orderBy: { room_id: 'asc' },
        include: includeObj,
      }),
      prisma.room.count({ where }),
    ]);

    res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      items,
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * GET /api/rooms/:id
 * ดึงข้อมูลห้องเดียว
 */
exports.getRoom = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ status: 'error', message: 'room_id is required' });
    }

    const includeObj = {};
    const inc = (req.query.include || '').split(',').map(s => s.trim().toLowerCase());
    if (inc.includes('type')) includeObj.room_type = true;
    if (inc.includes('images')) includeObj.room_image = true;

    const room = await prisma.room.findUnique({
      where: { room_id: id },
      include: includeObj,
    });

    if (!room) return res.status(404).json({ status: 'error', message: 'Room not found' });

    res.json(room);
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * POST /api/rooms
 */
exports.createRoom = async (req, res) => {
  try {
    const { room_number, room_type_id, capacity, price, status, description } = req.body;

    if (!room_number) return res.status(400).json({ message: 'room_number is required' });
    if (!room_type_id) return res.status(400).json({ message: 'room_type_id is required' });
    if (capacity === undefined) return res.status(400).json({ message: 'capacity is required' });
    if (price === undefined || price === null) return res.status(400).json({ message: 'price is required' });

    const data = {
      room_number,
      room_type_id: Number(room_type_id),
      capacity: Number(capacity),
      price: String(price),
      description,
    };
    if (status) data.status = status;

    const created = await prisma.room.create({ data });
    res.status(201).json({ status: 'ok', data: created });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ message: 'Duplicate room_number' });
    }
    res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * PUT /api/rooms/:id
 */
exports.updateRoom = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'room_id is required' });

    const { room_number, room_type_id, capacity, price, status, description } = req.body;

    const data = {};
    if (room_number !== undefined) data.room_number = room_number;
    if (room_type_id !== undefined) data.room_type_id = Number(room_type_id);
    if (capacity !== undefined) data.capacity = Number(capacity);
    if (price !== undefined && price !== null) data.price = String(price);
    if (status !== undefined) data.status = status;
    if (description !== undefined) data.description = description;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    const updated = await prisma.room.update({
      where: { room_id: id },
      data,
    });
    res.json({ status: 'ok', data: updated });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Room not found' });
    }
    if (err.code === 'P2002') {
      return res.status(409).json({ message: 'Duplicate room_number' });
    }
    res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * DELETE /api/rooms/:id
 */
exports.deleteRoom = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'room_id is required' });

    await prisma.room.delete({ where: { room_id: id } });
    res.json({ status: 'ok', message: `Room ${id} deleted` });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Room not found' });
    }
    res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * GET /api/room-types
 */
exports.getRoomTypes = async (_req, res) => {
  try {
    const types = await prisma.room_type.findMany({ orderBy: { room_type_id: 'asc' } });
    res.json(types);
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * GET /api/room-types/slug/:slug
 */
exports.getRoomTypeBySlug = async (req, res) => {
  try {
    const slug = String(req.params.slug || '').trim().toLowerCase();
    if (!slug) return res.status(400).json({ message: 'slug is required' });

    const type = await prisma.room_type.findUnique({
      where: { slug },
      select: {
        room_type_id: true,
        slug: true,
        type_name: true,
        type_name_en: true,
        description: true,
        amenities: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!type) return res.status(404).json({ message: 'Room type not found' });

    res.json(type);
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};
