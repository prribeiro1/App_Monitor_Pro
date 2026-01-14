
import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { Student, Incident } from '../types';
import { Icon } from '../components/Icon';

export const IncidentsScreen: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  // Form
  const [selectedStudent, setSelectedStudent] = useState('');
  const [type, setType] = useState('');
  const [observation, setObservation] = useState('');

  const fetchData = async () => {
    const [s, i] = await Promise.all([dbService.getStudents(), dbService.getIncidents()]);
    setStudents(s.sort((a, b) => a.name.localeCompare(b.name)));
    setIncidents(i.sort((a, b) => b.timestamp - a.timestamp));
    if (s.length > 0 && !selectedStudent) setSelectedStudent(s[0].id);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    const incident: Incident = {
      id: crypto.randomUUID(),
      studentId: selectedStudent,
      type: type || 'Geral',
      observation,
      date: new Date().toISOString(),
      timestamp: Date.now()
    };

    await dbService.saveIncident(incident);
    setObservation('');
    setType('');
    alert('Ocorrência registrada!');
    fetchData();
  };

  return (
    <div className="p-4 pb-20">
      <h2 className="text-2xl font-bold text-white mb-6">Ocorrências</h2>

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-navy-800 p-5 rounded-2xl border border-navy-700 shadow-lg mb-8">
        <div>
          <label className="text-sm text-gray-400">Aluno</label>
          <select
            value={selectedStudent}
            onChange={e => setSelectedStudent(e.target.value)}
            className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg mt-1"
            style={{ color: 'white', backgroundColor: '#1a1c35' }}
          >
            {students.map(s => <option key={s.id} value={s.id} style={{ color: 'black', backgroundColor: 'white' }}>{s.name}</option>)}
          </select>
        </div>
        <div className="mt-4">
          <label className="text-sm text-gray-400">Tipo da Ocorrência</label>
          <input
            value={type}
            onChange={e => setType(e.target.value)}
            placeholder="Ex: Comportamento, Material..."
            className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg mt-1"
            required
          />
        </div>
        <div className="mt-4 mb-6">
          <label className="text-sm text-gray-400">Observação Detalhada</label>
          <textarea
            value={observation}
            onChange={e => setObservation(e.target.value)}
            className="w-full bg-navy-900 border border-navy-700 text-white p-3 rounded-lg mt-1 min-h-[100px]"
            placeholder="Descreva o ocorrido..."
            required
          />
        </div>
        <button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-red-900/20 transition">
          Registrar Ocorrência
        </button>
      </form>

      {/* History List */}
      <h3 className="text-white font-bold mb-4">Histórico Recente</h3>
      <div className="space-y-3">
        {incidents.map(inc => {
          const student = students.find(s => s.id === inc.studentId);
          const date = new Date(inc.timestamp).toLocaleDateString('pt-BR');
          return (
            <div key={inc.id} className="bg-navy-800 p-4 rounded-xl border border-navy-700 border-l-4 border-l-red-500">
              <div className="flex justify-between mb-1">
                <span className="font-bold text-white">{student?.name || 'Aluno removido'}</span>
                <span className="text-xs text-gray-400">{date}</span>
              </div>
              <div className="text-sm text-accent-500 font-medium mb-1">{inc.type}</div>
              <p className="text-sm text-gray-300">{inc.observation}</p>
            </div>
          )
        })}
        {incidents.length === 0 && <p className="text-gray-500 text-center">Nenhuma ocorrência registrada.</p>}
      </div>
    </div>
  );
};
